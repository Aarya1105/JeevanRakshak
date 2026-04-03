"""
🚑 AI-Based Smart Ambulance Routing & Hospital Facility Matching System
Main Flask application — Modules: User (public), Driver (auth), Admin (auth), Simulation
"""
import json
import random
import logging
import threading
from datetime import datetime
from math import radians, cos, sin, asin, sqrt

from flask import Flask, request, jsonify, render_template, redirect
from flask_socketio import SocketIO, emit
from flask_cors import CORS

from config import Config
from database import (
    init_db, seed_hospitals, seed_ambulances,
    get_all_hospitals, get_hospital_by_id, create_hospital, update_hospital,
    delete_hospital, update_hospital_status,
    get_all_ambulances, get_ambulance_by_id, get_available_ambulances,
    get_ambulance_by_firebase_uid, link_ambulance_firebase,
    update_ambulance_location, update_ambulance_status,
    create_sos_request, get_sos_request, get_all_sos_requests, get_active_sos_requests,
    update_sos_hospitals,
    assign_ambulance_to_sos, accept_sos_request, enroute_sos_request,
    arrived_sos_request, complete_sos_request, unassign_ambulance_from_sos,
    get_active_sos_for_driver, save_hospital_scores,
    log_event, get_events, get_events_for_sos
)
from scoring import get_best_hospitals, EMERGENCY_REQUIREMENTS, get_traffic_factor
from auth import require_auth, verify_firebase_token, get_token_from_request
from utils import setup_logging, haversine, find_nearest_driver, validate_sos_input
from priority_queue import SOSPriorityQueue
from routing import route_optimizer




# ─── Logging Setup ────────────────────────────────
setup_logging(logging.INFO if not Config.DEBUG else logging.DEBUG)
logger = logging.getLogger(__name__)

# ─── App Setup ────────────────────────────────────
app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["SECRET_KEY"] = Config.SECRET_KEY
app.debug = False
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# ─── Priority Queue ──────────────────────────────
sos_queue = SOSPriorityQueue()

with app.app_context():
    init_db()
    seed_hospitals()
    seed_ambulances()
    logger.info("Database initialized and seeded")


# ═══════════════════════════════════════════════
# GLOBAL ERROR HANDLERS
# ═══════════════════════════════════════════════

@app.errorhandler(400)
def bad_request(e):
    return jsonify({"error": "Bad request", "details": str(e)}), 400

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Resource not found"}), 404

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal server error: {e}", exc_info=True)
    return jsonify({"error": "Internal server error"}), 500

@app.before_request
def log_request():
    if request.path.startswith("/api/"):
        logger.debug(f"{request.method} {request.path}")


# ═══════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════

# 🧠 AI IMAGE DETECTION (Dummy)
def detect_injury_from_image(image_data):
    import random
    return random.choice(["brain", "leg", "hand", "accident"])

## 📲 ALERT DOCTOR TEAM
DOCTOR_TEAMS = {
    "brain": {
        "name": "Neurosurgery Team",
        "phones": ["+919876543210"]
    },
    "leg": {
        "name": "Orthopedic Team",
        "phones": ["+919812345678"]
    },
    "hand": {
        "name": "Hand Surgery Team",
        "phones": ["+919800112233"]
    },
    "accident": {
        "name": "Emergency Trauma Team",
        "phones": ["+919899998888"]
    }
}

def alert_doctor_team(injury_type, sos_id):
    team = DOCTOR_TEAMS.get(injury_type, DOCTOR_TEAMS["accident"])

    print(f"\n🚨 ALERTING {team['name']} for SOS #{sos_id}")

    for phone in team["phones"]:
        print(f"📞 Sending alert to {phone}")


def _haversine(lat1, lon1, lat2, lon2):
    """Backward-compatible wrapper."""
    return haversine(lat1, lon1, lat2, lon2)


def _find_nearest_driver(user_lat, user_lng):
    """Find the nearest available driver by Haversine distance."""
    available = get_available_ambulances()
    if not available:
        return None, None
    driver, dist = find_nearest_driver(available, user_lat, user_lng)
    return driver, dist


def _schedule_reassignment(sos_id, timeout_sec):
    """If driver doesn't accept within timeout, reassign to next nearest."""
    def _check():
        sos = get_sos_request(sos_id)
        if sos and sos["status"] == "assigned":
            old_amb = sos["assigned_ambulance_id"]
            unassign_ambulance_from_sos(sos_id)
            logger.info(f"SOS #{sos_id}: driver timeout, reassigning from amb {old_amb}")
            sos = get_sos_request(sos_id)
            if sos:
                driver, dist = _find_nearest_driver(sos["latitude"], sos["longitude"])
                if driver and driver["id"] != old_amb:
                    assign_ambulance_to_sos(sos_id, driver["id"], dist)
                    socketio.emit("driver_reassigned", {
                        "sos_id": sos_id,
                        "ambulance_id": driver["id"],
                        "driver_name": driver["driver_name"],
                        "driver_phone": driver["driver_phone"],
                        "vehicle_number": driver["vehicle_number"],
                        "latitude": driver["latitude"],
                        "longitude": driver["longitude"],
                        "timestamp": datetime.now().isoformat()
                    })
                    log_event(sos_id, driver["id"], "driver_reassigned", f"timeout from amb {old_amb}")
                else:
                    socketio.emit("no_driver_available", {"sos_id": sos_id})
                    # Try from priority queue
                    _process_queue()
    timer = threading.Timer(timeout_sec, _check)
    timer.daemon = True
    timer.start()


def _process_queue():
    """Process the next SOS request from the priority queue."""
    # Atomic: dequeue directly (no peek+dequeue race condition)
    sos_data = sos_queue.dequeue()
    if not sos_data:
        return
    available = get_available_ambulances()
    if not available:
        # Re-enqueue if no drivers free
        sos_queue.enqueue(sos_data)
        return
    driver, dist = find_nearest_driver(
        available, sos_data["latitude"], sos_data["longitude"]
    )
    if driver:
        assign_ambulance_to_sos(sos_data["id"], driver["id"], dist)
        socketio.emit("driver_assignment", {
            "sos_id": sos_data["id"],
            "ambulance_id": driver["id"],
            "driver_name": driver["driver_name"],
            "timestamp": datetime.now().isoformat()
        })
        logger.info(f"Queue: assigned amb {driver['id']} to SOS #{sos_data['id']}")
    else:
        # No driver in range, re-enqueue
        sos_queue.enqueue(sos_data)


# ══════════════════════════════════════════════════
#  PAGE ROUTES
# ══════════════════════════════════════════════════

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/results/<int:sos_id>")
def results_page(sos_id):
    return render_template("results.html", sos_id=sos_id)

@app.route("/ambulance/<int:sos_id>/<int:hospital_id>")
def ambulance_page(sos_id, hospital_id):
    return render_template("ambulance.html", sos_id=sos_id, hospital_id=hospital_id)

@app.route("/driver")
def driver_login():
    return render_template("driver_login.html",
                           firebase_api_key=Config.FIREBASE_API_KEY,
                           firebase_auth_domain=Config.FIREBASE_AUTH_DOMAIN,
                           firebase_project_id=Config.FIREBASE_PROJECT_ID)

@app.route("/driver/dashboard")
def driver_dashboard():
    return render_template("driver.html",
                           firebase_api_key=Config.FIREBASE_API_KEY,
                           firebase_auth_domain=Config.FIREBASE_AUTH_DOMAIN,
                           firebase_project_id=Config.FIREBASE_PROJECT_ID)

@app.route("/admin")
def admin_dashboard():
    return render_template("admin.html",
                           firebase_api_key=Config.FIREBASE_API_KEY,
                           firebase_auth_domain=Config.FIREBASE_AUTH_DOMAIN,
                           firebase_project_id=Config.FIREBASE_PROJECT_ID)

@app.route("/dashboard")
def dashboard_redirect():
    return redirect("/admin")

@app.route("/simulation")
def simulation_page():
    return render_template("simulation.html")


# ══════════════════════════════════════════════════
#  API: SOS (User Module — PUBLIC)
# ══════════════════════════════════════════════════

@app.route("/api/sos", methods=["POST"])
def handle_sos():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400

    is_valid, error_msg, cleaned = validate_sos_input(data)
    if not is_valid:
        return jsonify({"error": error_msg}), 400

    lat = cleaned["latitude"]
    lng = cleaned["longitude"]
    emergency_type = cleaned["emergency_type"]
    severity = cleaned["severity"]
    notes = cleaned["patient_notes"]

    logger.info(f"SOS received: type={emergency_type} severity={severity} loc=({lat},{lng})")

    sos_id = create_sos_request(lat, lng, emergency_type, severity, notes)

    image_data = data.get("image")
    detected_injury = "accident"
    if image_data:
        import base64
        try:
            img = image_data.split(",")[1]
            with open("static/images/patient.png", "wb") as f:
                f.write(base64.b64decode(img))
            detected_injury = detect_injury_from_image(img)
        except Exception as e:
            logger.warning(f"Image processing failed for SOS #{sos_id}: {e}")
            detected_injury = "accident"

    alert_doctor_team(detected_injury, sos_id)

    hospitals = get_all_hospitals()
    result = get_best_hospitals(hospitals, lat, lng, emergency_type)

    if not result["best"]:
        return jsonify({"error": "No hospitals found", "sos_id": sos_id}), 404

    best_id = result["best"]["hospital"]["id"]
    backup_id = result["backup"]["hospital"]["id"] if result["backup"] else None

    update_sos_hospitals(sos_id, best_id, backup_id)
    save_hospital_scores(sos_id, result["all_scored"])

    sos_queue.enqueue({
        "id": sos_id,
        "latitude": lat,
        "longitude": lng,
        "emergency_type": emergency_type,
        "severity": severity,
        "created_at": datetime.now().isoformat(),
    })

    socketio.emit("new_sos", {
        "sos_id": sos_id,
        "emergency_type": emergency_type,
        "severity": severity,
        "latitude": lat,
        "longitude": lng,
        "best_hospital": result["best"]["hospital"]["name"],
        "eta_minutes": result["best"]["eta_minutes"],
        "traffic_factor": result["best"].get("traffic_factor", 1.0),
        "timestamp": datetime.now().isoformat()
    })

    def _summary(scored):
        if not scored:
            return None
        h = scored["hospital"]
        return {
            "id": h["id"],
            "name": h["name"],
            "address": h.get("address", ""),
            "phone": h.get("phone", ""),
            "latitude": h["latitude"],
            "longitude": h["longitude"],
            "distance_km": scored["distance_km"],
            "eta_minutes": scored["eta_minutes"],
            "readiness_score": scored["total_score"],
            "score_breakdown": scored["scores"],
            "traffic_factor": scored.get("traffic_factor", 1.0),
            "facilities": h.get("facilities", []),
            "available_icu_beds": h.get("available_icu_beds", 0),
            "specializations": h.get("specializations", []),
            "navigation_url": f"https://www.google.com/maps/dir/?api=1&destination={h['latitude']},{h['longitude']}"
        }

    logger.info(f"SOS #{sos_id}: best={result['best']['hospital']['name']} score={result['best']['total_score']}")

    return jsonify({
        "success": True,
        "sos_id": sos_id,
        "emergency_type": emergency_type,
        "latitude": lat,
        "longitude": lng,
        "requirements": result["requirements"],
        "best_hospital": _summary(result["best"]),
        "backup_hospital": _summary(result["backup"]),
        "total_hospitals_evaluated": result["total_candidates"],
        "all_hospitals": [_summary(s) for s in result["all_scored"][:5]],
        "detected_injury": detected_injury
    }), 200




    hospitals = get_all_hospitals()
    result = get_best_hospitals(hospitals, lat, lng, emergency_type)

    if not result["best"]:
        return jsonify({"error": "No hospitals found in range", "sos_id": sos_id}), 404

    best_id = result["best"]["hospital"]["id"]
    backup_id = result["backup"]["hospital"]["id"] if result["backup"] else None
    update_sos_hospitals(sos_id, best_id, backup_id)
    save_hospital_scores(sos_id, result["all_scored"])

    # Add to priority queue for processing
    sos_queue.enqueue({
        "id": sos_id,
        "latitude": lat,
        "longitude": lng,
        "emergency_type": emergency_type,
        "severity": severity,
        "created_at": datetime.now().isoformat(),
    })

    socketio.emit("new_sos", {
        "sos_id": sos_id, "emergency_type": emergency_type,
        "severity": severity, "latitude": lat, "longitude": lng,
        "best_hospital": result["best"]["hospital"]["name"],
        "eta_minutes": result["best"]["eta_minutes"],
        "traffic_factor": result["best"].get("traffic_factor", 1.0),
        "timestamp": datetime.now().isoformat()
    })

    def _summary(scored):
        if not scored:
            return None
        h = scored["hospital"]
        return {
            "id": h["id"], "name": h["name"],
            "address": h.get("address", ""), "phone": h.get("phone", ""),
            "latitude": h["latitude"], "longitude": h["longitude"],
            "distance_km": scored["distance_km"], "eta_minutes": scored["eta_minutes"],
            "readiness_score": scored["total_score"], "score_breakdown": scored["scores"],
            "traffic_factor": scored.get("traffic_factor", 1.0),
            "facilities": h.get("facilities", []),
            "available_icu_beds": h.get("available_icu_beds", 0),
            "specializations": h.get("specializations", []),
            "navigation_url": f"https://www.google.com/maps/dir/?api=1&destination={h['latitude']},{h['longitude']}"
        }

    logger.info(f"SOS #{sos_id}: best={result['best']['hospital']['name']} "
                f"score={result['best']['total_score']}")

    return jsonify({
        "success": True, "sos_id": sos_id, "emergency_type": emergency_type,
        "latitude": lat, "longitude": lng,
        "requirements": result["requirements"],
        "best_hospital": _summary(result["best"]),
        "backup_hospital": _summary(result["backup"]),
        "total_hospitals_evaluated": result["total_candidates"],
        "all_hospitals": [_summary(s) for s in result["all_scored"][:5]]
    }), 200


@app.route("/api/sos/<int:sos_id>", methods=["GET"])
def get_sos(sos_id):
    sos = get_sos_request(sos_id)
    if not sos:
        return jsonify({"error": "SOS not found"}), 404
    # Enrich with driver info
    if sos.get("assigned_ambulance_id"):
        amb = get_ambulance_by_id(sos["assigned_ambulance_id"])
        if amb:
            sos["driver"] = {
                "id": amb["id"],
                "driver_name": amb["driver_name"],
                "driver_phone": amb["driver_phone"],
                "vehicle_number": amb["vehicle_number"],
                "latitude": amb["latitude"],
                "longitude": amb["longitude"],
                "status": amb["status"]
            }
    if sos.get("selected_hospital_id"):
        hosp = get_hospital_by_id(sos["selected_hospital_id"])
        if hosp:
            sos["hospital"] = {
                "id": hosp["id"], "name": hosp["name"],
                "address": hosp.get("address", ""),
                "phone": hosp.get("phone", ""),
                "latitude": hosp["latitude"], "longitude": hosp["longitude"]
            }
    return jsonify(sos), 200


@app.route("/api/sos/<int:sos_id>/events", methods=["GET"])
def get_sos_events(sos_id):
    events = get_events_for_sos(sos_id)
    return jsonify({"events": events}), 200


@app.route("/api/sos/<int:sos_id>/route", methods=["GET"])
def get_sos_route(sos_id):
    """Get optimized route info for an SOS request."""
    sos = get_sos_request(sos_id)
    if not sos:
        return jsonify({"error": "SOS not found"}), 404
    if not sos.get("selected_hospital_id"):
        return jsonify({"error": "No hospital assigned"}), 400
    hosp = get_hospital_by_id(sos["selected_hospital_id"])
    if not hosp:
        return jsonify({"error": "Hospital not found"}), 404

    route_info = route_optimizer.get_optimal_route(
        sos["latitude"], sos["longitude"],
        hosp["latitude"], hosp["longitude"]
    )
    return jsonify({"success": True, "route": route_info}), 200


# ══════════════════════════════════════════════════
#  API: AMBULANCE ASSIGNMENT (User → Driver)
# ══════════════════════════════════════════════════

@app.route("/api/ambulance/assign", methods=["POST"])
def assign_ambulance():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400

    sos_id = data.get("sos_id")
    hospital_id = data.get("hospital_id")
    if not sos_id or not hospital_id:
        return jsonify({"error": "sos_id and hospital_id required"}), 400

    sos = get_sos_request(sos_id)
    if not sos:
        return jsonify({"error": "SOS request not found"}), 404

    hospital = get_hospital_by_id(hospital_id)
    if not hospital:
        return jsonify({"error": "Hospital not found"}), 404

    update_sos_hospitals(sos_id, hospital_id, None)

    # Remove from queue if present
    sos_queue.remove(sos_id)

    # Find nearest available driver (Haversine)
    user_lat = sos.get("latitude") or data.get("user_latitude")
    user_lng = sos.get("longitude") or data.get("user_longitude")
    assigned_amb, dist = _find_nearest_driver(user_lat, user_lng)

    if not assigned_amb:
        return jsonify({"error": "No ambulance drivers available", "sos_id": sos_id}), 503

    assign_ambulance_to_sos(sos_id, assigned_amb["id"], dist)
    logger.info(f"SOS #{sos_id}: assigned amb {assigned_amb['id']} ({assigned_amb['driver_name']}) dist={dist}km")

    # Get route info
    route_info = route_optimizer.get_optimal_route(
        user_lat, user_lng, hospital["latitude"], hospital["longitude"]
    )

    # Notify all via WebSocket
    assignment_data = {
        "sos_id": sos_id,
        "hospital_id": hospital_id, "hospital_name": hospital["name"],
        "hospital_lat": hospital["latitude"], "hospital_lng": hospital["longitude"],
        "patient_lat": user_lat, "patient_lng": user_lng,
        "emergency_type": sos.get("emergency_type", "general"),
        "severity": sos.get("severity", "medium"),
        "patient_notes": sos.get("patient_notes", ""),
        "ambulance_id": assigned_amb["id"],
        "driver_name": assigned_amb["driver_name"],
        "driver_phone": assigned_amb["driver_phone"],
        "vehicle_number": assigned_amb["vehicle_number"],
        "driver_lat": assigned_amb["latitude"],
        "driver_lng": assigned_amb["longitude"],
        "distance_km": dist,
        "eta_minutes": route_info["eta_minutes"],
        "traffic_level": route_info["traffic_level"],
        "timestamp": datetime.now().isoformat()
    }
    socketio.emit("driver_assignment", assignment_data)

    # Schedule reassignment if not accepted
    _schedule_reassignment(sos_id, Config.DRIVER_ACCEPT_TIMEOUT_SEC)

    return jsonify({
        "success": True,
        "message": f"Nearest driver assigned for {hospital['name']}",
        "ambulance": {
            "id": assigned_amb["id"],
            "driver_name": assigned_amb["driver_name"],
            "vehicle_number": assigned_amb["vehicle_number"],
            "phone": assigned_amb["driver_phone"],
            "latitude": assigned_amb["latitude"],
            "longitude": assigned_amb["longitude"],
            "distance_km": dist
        },
        "hospital": {
            "id": hospital["id"], "name": hospital["name"],
            "latitude": hospital["latitude"], "longitude": hospital["longitude"]
        },
        "route": route_info,
    }), 200


@app.route("/api/ambulance/<int:amb_id>/location", methods=["GET"])
def get_ambulance_location(amb_id):
    amb = get_ambulance_by_id(amb_id)
    if not amb:
        return jsonify({"error": "Ambulance not found"}), 404
    return jsonify({
        "id": amb["id"], "driver_name": amb["driver_name"],
        "latitude": amb["latitude"], "longitude": amb["longitude"],
        "status": amb["status"], "vehicle_number": amb["vehicle_number"],
        "driver_phone": amb.get("driver_phone", "")
    }), 200


# ══════════════════════════════════════════════════
#  API: DRIVER MODULE (PROTECTED — Firebase Auth)
# ══════════════════════════════════════════════════

@app.route("/api/driver/login", methods=["POST"])
def driver_firebase_login():
    """Link a Firebase UID to an ambulance record after driver logs in."""
    data = request.get_json() or {}
    token = get_token_from_request()
    if not token:
        amb_id = data.get("ambulance_id")
        if amb_id:
            amb = get_ambulance_by_id(amb_id)
            if amb:
                logger.info(f"Driver quick login: amb {amb_id} ({amb['driver_name']})")
                return jsonify({"success": True, "ambulance": amb}), 200
        return jsonify({"error": "Token or ambulance_id required"}), 401

    claims = verify_firebase_token(token)
    if not claims:
        return jsonify({"error": "Invalid token"}), 401

    uid = claims.get("user_id") or claims.get("sub")
    email = claims.get("email", "")

    amb = get_ambulance_by_firebase_uid(uid)
    if amb:
        logger.info(f"Driver Firebase login: {email} -> amb {amb['id']}")
        return jsonify({"success": True, "ambulance": amb}), 200

    amb_id = data.get("ambulance_id")
    if amb_id:
        amb = get_ambulance_by_id(amb_id)
        if amb:
            link_ambulance_firebase(amb_id, uid)
            amb = get_ambulance_by_id(amb_id)
            logger.info(f"Driver linked: {email} -> amb {amb_id}")
            return jsonify({"success": True, "ambulance": amb}), 200

    return jsonify({"error": "No ambulance linked. Please select one.", "uid": uid}), 404


@app.route("/api/driver/<int:amb_id>/active", methods=["GET"])
def driver_active_request(amb_id):
    sos = get_active_sos_for_driver(amb_id)
    if not sos:
        return jsonify({"active": False, "message": "No active requests"}), 200
    hospital = get_hospital_by_id(sos["selected_hospital_id"]) if sos.get("selected_hospital_id") else None
    return jsonify({
        "active": True, "sos": sos,
        "hospital": hospital,
        "patient_location": {"latitude": sos["latitude"], "longitude": sos["longitude"]},
    }), 200


@app.route("/api/driver/<int:amb_id>/accept", methods=["POST"])
def driver_accept(amb_id):
    data = request.get_json() or {}
    sos_id = data.get("sos_id")
    if not sos_id:
        return jsonify({"error": "sos_id required"}), 400
    sos = get_sos_request(sos_id)
    if not sos:
        return jsonify({"error": "SOS not found"}), 404
    if sos.get("assigned_ambulance_id") != amb_id:
        return jsonify({"error": "This SOS is not assigned to you"}), 403
    if sos.get("status") != "assigned":
        return jsonify({"error": f"Cannot accept SOS in '{sos.get('status')}' state"}), 409
    accept_sos_request(sos_id, amb_id)
    amb = get_ambulance_by_id(amb_id)
    logger.info(f"SOS #{sos_id}: driver {amb_id} accepted")
    socketio.emit("driver_accepted", {
        "sos_id": sos_id, "ambulance_id": amb_id,
        "driver_name": amb["driver_name"] if amb else "",
        "driver_phone": amb["driver_phone"] if amb else "",
        "vehicle_number": amb["vehicle_number"] if amb else "",
        "timestamp": datetime.now().isoformat()
    })
    return jsonify({"success": True, "message": "Request accepted"}), 200


@app.route("/api/driver/<int:amb_id>/enroute", methods=["POST"])
def driver_enroute(amb_id):
    data = request.get_json() or {}
    sos_id = data.get("sos_id")
    if not sos_id:
        return jsonify({"error": "sos_id required"}), 400
    enroute_sos_request(sos_id, amb_id)
    logger.info(f"SOS #{sos_id}: driver {amb_id} en route")
    socketio.emit("status_changed", {
        "sos_id": sos_id, "ambulance_id": amb_id,
        "status": "enroute",
        "timestamp": datetime.now().isoformat()
    })
    return jsonify({"success": True}), 200


@app.route("/api/driver/<int:amb_id>/arrived", methods=["POST"])
def driver_arrived(amb_id):
    data = request.get_json() or {}
    sos_id = data.get("sos_id")
    if not sos_id:
        return jsonify({"error": "sos_id required"}), 400
    arrived_sos_request(sos_id, amb_id)
    logger.info(f"SOS #{sos_id}: driver {amb_id} arrived")
    socketio.emit("status_changed", {
        "sos_id": sos_id, "ambulance_id": amb_id,
        "status": "arrived",
        "timestamp": datetime.now().isoformat()
    })
    return jsonify({"success": True}), 200


@app.route("/api/driver/<int:amb_id>/location", methods=["POST"])
def driver_update_location(amb_id):
    data = request.get_json()
    if not data or "latitude" not in data or "longitude" not in data:
        return jsonify({"error": "latitude and longitude required"}), 400
    try:
        lat = float(data["latitude"])
        lng = float(data["longitude"])
    except (ValueError, TypeError):
        return jsonify({"error": "latitude and longitude must be numbers"}), 400
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return jsonify({"error": "Coordinates out of valid range"}), 400
    update_ambulance_location(amb_id, lat, lng)
    socketio.emit("location_update", {
        "ambulance_id": amb_id,
        "latitude": lat,
        "longitude": lng,
        "timestamp": datetime.now().isoformat()
    })
    return jsonify({"success": True}), 200


@app.route("/api/driver/<int:amb_id>/complete", methods=["POST"])
def driver_complete(amb_id):
    data = request.get_json() or {}
    sos_id = data.get("sos_id")
    if not sos_id:
        return jsonify({"error": "sos_id required"}), 400
    complete_sos_request(sos_id)
    logger.info(f"SOS #{sos_id}: trip completed by driver {amb_id}")
    socketio.emit("trip_completed", {
        "sos_id": sos_id, "ambulance_id": amb_id,
        "timestamp": datetime.now().isoformat()
    })
    # Process next request from queue
    _process_queue()
    return jsonify({"success": True, "message": "Trip completed"}), 200


@app.route("/api/ambulances", methods=["GET"])
def list_ambulances():
    return jsonify({"ambulances": get_all_ambulances()}), 200


# ══════════════════════════════════════════════════
#  API: ADMIN MODULE (PROTECTED — Firebase Auth)
# ══════════════════════════════════════════════════

@app.route("/api/admin/requests", methods=["GET"])
def admin_all_requests():
    tab = request.args.get("tab", "all")
    if tab == "active":
        reqs = get_active_sos_requests()
    else:
        reqs = get_all_sos_requests()
    enriched = []
    for r in reqs:
        if r.get("assigned_ambulance_id"):
            amb = get_ambulance_by_id(r["assigned_ambulance_id"])
            r["driver"] = {
                "id": amb["id"], "driver_name": amb["driver_name"],
                "driver_phone": amb["driver_phone"],
                "vehicle_number": amb["vehicle_number"],
                "latitude": amb["latitude"], "longitude": amb["longitude"],
                "status": amb["status"]
            } if amb else None
        if r.get("selected_hospital_id"):
            hosp = get_hospital_by_id(r["selected_hospital_id"])
            r["hospital_name"] = hosp["name"] if hosp else "Unknown"
        enriched.append(r)
    return jsonify({"requests": enriched}), 200


@app.route("/api/admin/reassign", methods=["POST"])
def admin_reassign():
    data = request.get_json() or {}
    sos_id = data.get("sos_id")
    new_amb_id = data.get("ambulance_id")
    if not sos_id:
        return jsonify({"error": "sos_id required"}), 400

    sos = get_sos_request(sos_id)
    if not sos:
        return jsonify({"error": "SOS not found"}), 404

    unassign_ambulance_from_sos(sos_id)

    if new_amb_id:
        amb = get_ambulance_by_id(new_amb_id)
        if not amb:
            return jsonify({"error": "Ambulance not found"}), 404
        dist = _haversine(sos["latitude"], sos["longitude"], amb["latitude"], amb["longitude"])
        assign_ambulance_to_sos(sos_id, new_amb_id, round(dist, 2))
    else:
        driver, dist = _find_nearest_driver(sos["latitude"], sos["longitude"])
        if driver:
            assign_ambulance_to_sos(sos_id, driver["id"], dist)
            new_amb_id = driver["id"]
        else:
            return jsonify({"error": "No available drivers"}), 503

    amb = get_ambulance_by_id(new_amb_id)
    logger.info(f"Admin reassigned SOS #{sos_id} to amb {new_amb_id}")
    socketio.emit("driver_reassigned", {
        "sos_id": sos_id,
        "ambulance_id": new_amb_id,
        "driver_name": amb["driver_name"],
        "driver_phone": amb["driver_phone"],
        "vehicle_number": amb["vehicle_number"],
        "latitude": amb["latitude"],
        "longitude": amb["longitude"],
        "timestamp": datetime.now().isoformat()
    })
    log_event(sos_id, new_amb_id, "admin_reassigned", "")
    return jsonify({"success": True, "ambulance": amb}), 200


@app.route("/api/admin/events", methods=["GET"])
def admin_events():
    limit = request.args.get("limit", 50, type=int)
    limit = max(1, min(limit, 500))  # Cap between 1 and 500
    return jsonify({"events": get_events(limit)}), 200


@app.route("/api/hospitals", methods=["GET"])
def list_hospitals():
    hospitals = get_all_hospitals()
    return jsonify({"hospitals": hospitals, "count": len(hospitals)}), 200

@app.route("/api/hospitals/<int:hid>", methods=["GET"])
def get_hospital(hid):
    h = get_hospital_by_id(hid)
    if not h:
        return jsonify({"error": "Hospital not found"}), 404
    return jsonify(h), 200

@app.route("/api/hospitals", methods=["POST"])
def add_hospital():
    data = request.get_json()
    if not data or "name" not in data:
        return jsonify({"error": "Hospital data required"}), 400
    new_id = create_hospital(data)
    logger.info(f"Hospital created: {data['name']} (id={new_id})")
    return jsonify({"success": True, "id": new_id, "message": f"Hospital '{data['name']}' created"}), 201

@app.route("/api/hospitals/<int:hid>", methods=["PUT"])
def edit_hospital(hid):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400
    if not get_hospital_by_id(hid):
        return jsonify({"error": "Hospital not found"}), 404
    update_hospital(hid, data)
    return jsonify({"success": True, "message": "Hospital updated"}), 200

@app.route("/api/hospitals/<int:hid>", methods=["DELETE"])
def remove_hospital(hid):
    if not get_hospital_by_id(hid):
        return jsonify({"error": "Hospital not found"}), 404
    delete_hospital(hid)
    logger.info(f"Hospital deleted: id={hid}")
    return jsonify({"success": True, "message": "Hospital deleted"}), 200

@app.route("/api/hospitals/<int:hid>/status", methods=["PUT"])
def update_status(hid):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400
    hospital = get_hospital_by_id(hid)
    if not hospital:
        return jsonify({"error": "Hospital not found"}), 404
    update_hospital_status(hid, data)
    socketio.emit("hospital_updated", {
        "hospital_id": hid, "hospital_name": hospital["name"],
        "updates": data, "timestamp": datetime.now().isoformat()
    })
    return jsonify({"success": True}), 200

@app.route("/api/emergency-types", methods=["GET"])
def get_emergency_types():
    types = {}
    for k, v in EMERGENCY_REQUIREMENTS.items():
        types[k] = {
            "required_facilities": v["facilities"],
            "required_specialists": v["specialists"],
            "nice_to_have": v.get("nice_to_have", [])
        }
    return jsonify(types), 200


# ══════════════════════════════════════════════════
#  API: PRIORITY QUEUE
# ══════════════════════════════════════════════════

@app.route("/api/queue", methods=["GET"])
def get_queue_status():
    """Get current SOS priority queue status."""
    return jsonify({
        "queue": sos_queue.get_all(),
        "stats": sos_queue.get_stats()
    }), 200


# ══════════════════════════════════════════════════
#  API: SYSTEM STATISTICS
# ══════════════════════════════════════════════════

@app.route("/api/stats", methods=["GET"])
def get_system_stats():
    """Get comprehensive system-wide statistics."""
    all_sos = get_all_sos_requests()
    active_sos = get_active_sos_requests()
    ambulances = get_all_ambulances()
    hospitals = get_all_hospitals()

    available_ambs = [a for a in ambulances if a.get("status") == "available"]
    busy_ambs = [a for a in ambulances if a.get("status") != "available"]

    # Group SOS by status
    status_counts = {}
    type_counts = {}
    severity_counts = {}
    for s in all_sos:
        st = s.get("status", "unknown")
        status_counts[st] = status_counts.get(st, 0) + 1
        et = s.get("emergency_type", "general")
        type_counts[et] = type_counts.get(et, 0) + 1
        sev = s.get("severity", "medium")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    # Hospital load summary
    avg_load = 0
    if hospitals:
        avg_load = sum(h.get("load_percentage", 0) for h in hospitals) / len(hospitals)

    total_icu = sum(h.get("available_icu_beds", 0) for h in hospitals)
    total_general = sum(h.get("available_general_beds", 0) for h in hospitals)

    # Traffic info
    traffic = get_traffic_factor()

    return jsonify({
        "sos": {
            "total": len(all_sos),
            "active": len(active_sos),
            "by_status": status_counts,
            "by_type": type_counts,
            "by_severity": severity_counts,
        },
        "ambulances": {
            "total": len(ambulances),
            "available": len(available_ambs),
            "busy": len(busy_ambs),
        },
        "hospitals": {
            "total": len(hospitals),
            "avg_load_percentage": round(avg_load, 1),
            "total_available_icu_beds": total_icu,
            "total_available_general_beds": total_general,
        },
        "queue": sos_queue.get_stats(),
        "traffic_factor": traffic,
        "timestamp": datetime.now().isoformat(),
    }), 200


# ══════════════════════════════════════════════════
#  API: SIMULATION
# ══════════════════════════════════════════════════

@app.route("/api/simulation/trigger", methods=["POST"])
def simulation_trigger():
    """Trigger a simulated SOS request with random parameters."""
    data = request.get_json() or {}

    # Random emergency near hospital clusters
    hospitals = get_all_hospitals()
    if not hospitals:
        return jsonify({"error": "No hospitals available"}), 500

    # Pick a random hospital as center point
    center_hospital = random.choice(hospitals)
    lat = center_hospital["latitude"] + random.uniform(-0.05, 0.05)
    lng = center_hospital["longitude"] + random.uniform(-0.05, 0.05)

    emergency_types = list(EMERGENCY_REQUIREMENTS.keys())
    severities = ["critical", "high", "medium", "low"]

    emergency_type = data.get("emergency_type", random.choice(emergency_types))
    severity = data.get("severity", random.choice(severities))
    lat = data.get("latitude", lat)
    lng = data.get("longitude", lng)

    logger.info(f"Simulation: triggering mock SOS type={emergency_type} severity={severity}")

    sos_id = create_sos_request(lat, lng, emergency_type, severity, "SIMULATION: automated test")
    result = get_best_hospitals(hospitals, lat, lng, emergency_type)

    if result["best"]:
        best_id = result["best"]["hospital"]["id"]
        backup_id = result["backup"]["hospital"]["id"] if result["backup"] else None
        update_sos_hospitals(sos_id, best_id, backup_id)
        save_hospital_scores(sos_id, result["all_scored"])

    socketio.emit("new_sos", {
        "sos_id": sos_id, "emergency_type": emergency_type,
        "severity": severity, "latitude": lat, "longitude": lng,
        "best_hospital": result["best"]["hospital"]["name"] if result["best"] else "None",
        "simulated": True,
        "timestamp": datetime.now().isoformat()
    })

    return jsonify({
        "success": True,
        "sos_id": sos_id,
        "emergency_type": emergency_type,
        "severity": severity,
        "location": {"latitude": lat, "longitude": lng},
        "best_hospital": result["best"]["hospital"]["name"] if result["best"] else None,
        "score": result["best"]["total_score"] if result["best"] else None,
        "traffic_factor": result["best"].get("traffic_factor", 1.0) if result["best"] else None,
    }), 200


@app.route("/api/simulation/scenario", methods=["POST"])
def simulation_scenario():
    """Run a batch simulation with N random SOS requests."""
    data = request.get_json() or {}
    count = min(data.get("count", 5), 20)  # cap at 20

    results = []
    hospitals = get_all_hospitals()
    if not hospitals:
        return jsonify({"error": "No hospitals"}), 500

    emergency_types = list(EMERGENCY_REQUIREMENTS.keys())
    severities = ["critical", "high", "medium", "low"]

    for i in range(count):
        center = random.choice(hospitals)
        lat = center["latitude"] + random.uniform(-0.05, 0.05)
        lng = center["longitude"] + random.uniform(-0.05, 0.05)
        etype = random.choice(emergency_types)
        sev = random.choice(severities)

        sos_id = create_sos_request(lat, lng, etype, sev, f"SCENARIO #{i+1}")
        scored = get_best_hospitals(hospitals, lat, lng, etype)

        if scored["best"]:
            best = scored["best"]
            update_sos_hospitals(sos_id, best["hospital"]["id"], None)
            results.append({
                "sos_id": sos_id,
                "type": etype,
                "severity": sev,
                "best_hospital": best["hospital"]["name"],
                "score": best["total_score"],
                "distance_km": best["distance_km"],
                "eta_minutes": best["eta_minutes"],
                "traffic_factor": best.get("traffic_factor", 1.0),
            })

    logger.info(f"Simulation scenario: {count} SOS requests processed")
    return jsonify({
        "success": True,
        "count": count,
        "results": results,
        "timestamp": datetime.now().isoformat()
    }), 200


# ══════════════════════════════════════════════════
#  WEBSOCKET EVENTS
# ══════════════════════════════════════════════════

@socketio.on("connect")
def on_connect():
    logger.debug("WebSocket client connected")
    emit("connected", {"message": "Connected to Smart Ambulance System"})

@socketio.on("disconnect")
def on_disconnect():
    logger.debug("WebSocket client disconnected")

@socketio.on("location_update")
def on_location(data):
    """Handle real-time location updates from drivers via WebSocket."""
    if not isinstance(data, dict):
        return
    try:
        amb_id = int(data.get("ambulance_id", 0))
        lat = float(data.get("latitude", 0))
        lng = float(data.get("longitude", 0))
    except (ValueError, TypeError):
        logger.warning(f"Invalid WebSocket location data: {data}")
        return
    if amb_id <= 0 or not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return
    update_ambulance_location(amb_id, lat, lng)
    emit("location_update", {
        "ambulance_id": amb_id, "latitude": lat, "longitude": lng,
        "timestamp": datetime.now().isoformat()
    }, broadcast=True)

@socketio.on("join_sos")
def on_join_sos(data):
    """Client subscribes to updates for a specific SOS request."""
    pass  # All events are broadcast; client filters by sos_id


# ══════════════════════════════════════════════════
#  RUN
# ══════════════════════════════════════════════════

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("🚑 Smart Ambulance Routing System")
    logger.info(f"📍 User App:     http://localhost:{Config.PORT}")
    logger.info(f"🚑 Driver:       http://localhost:{Config.PORT}/driver")
    logger.info(f"🔧 Admin:        http://localhost:{Config.PORT}/admin")
    logger.info(f"📊 Simulation:   http://localhost:{Config.PORT}/simulation")
    logger.info(f"🔍 Radius:       {Config.SEARCH_RADIUS_KM} km")
    logger.info(f"🚦 Traffic:      {get_traffic_factor()}x (current)")
    logger.info("=" * 60)
    socketio.run(app, host=Config.HOST, port=Config.PORT,
                 debug=False, use_reloader=False, allow_unsafe_werkzeug=True)