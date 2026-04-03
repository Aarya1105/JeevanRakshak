"""
Route Optimizer — Simulated traffic-aware routing engine.

Provides route optimization between two GPS points with simulated
road network and traffic conditions. Uses weighted graph approach
to estimate realistic ETAs.
"""
import logging
import random
from collections import OrderedDict
from math import radians, cos, sin, asin, sqrt, atan2, degrees
from datetime import datetime

logger = logging.getLogger(__name__)

MAX_CACHE_SIZE = 1000  # Prevent unbounded memory growth


class RouteOptimizer:
    """
    Simulated route optimizer with traffic-awareness.

    For production, this would integrate with Google Maps Directions API.
    For demo/hackathon, it simulates realistic road routing.
    """

    # Road type multipliers (how much longer road distance is vs straight-line)
    ROAD_MULTIPLIER = {
        "urban": 1.4,     # city roads are ~40% longer than straight-line
        "suburban": 1.3,   # suburbs slightly more direct
        "highway": 1.15,   # highways are fairly direct
    }

    def __init__(self):
        self._cache = OrderedDict()  # LRU route cache

    def get_optimal_route(self, origin_lat, origin_lng, dest_lat, dest_lng):
        """
        Calculate the optimal route between two points.

        Returns:
            dict with route info: distance_km, eta_minutes, traffic_factor,
                                  road_type, route_description
        """
        cache_key = f"{origin_lat:.4f},{origin_lng:.4f}-{dest_lat:.4f},{dest_lng:.4f}"
        if cache_key in self._cache:
            self._cache.move_to_end(cache_key)  # LRU: mark as recently used
            cached = self._cache[cache_key]
            # Refresh traffic for cached routes
            cached["traffic_factor"] = self._get_traffic_factor(cached["straight_line_km"])
            cached["eta_minutes"] = self._calculate_eta(
                cached["road_distance_km"], cached["traffic_factor"], cached["road_type"]
            )
            return cached

        # Calculate straight-line distance
        straight_line_km = self._haversine(origin_lat, origin_lng, dest_lat, dest_lng)

        # Determine road type based on distance
        road_type = self._classify_road_type(straight_line_km)

        # Calculate realistic road distance
        multiplier = self.ROAD_MULTIPLIER[road_type]
        road_distance_km = straight_line_km * multiplier

        # Get traffic conditions
        traffic_factor = self._get_traffic_factor(straight_line_km)

        # Calculate ETA
        eta_minutes = self._calculate_eta(road_distance_km, traffic_factor, road_type)

        # Generate intermediate route points for visualization
        waypoints = self._generate_waypoints(
            origin_lat, origin_lng, dest_lat, dest_lng, num_points=5
        )

        result = {
            "straight_line_km": round(straight_line_km, 2),
            "road_distance_km": round(road_distance_km, 2),
            "eta_minutes": round(eta_minutes, 1),
            "traffic_factor": traffic_factor,
            "road_type": road_type,
            "traffic_level": self._traffic_level_label(traffic_factor),
            "waypoints": waypoints,
            "route_description": self._describe_route(
                road_distance_km, eta_minutes, road_type, traffic_factor
            ),
        }

        self._cache[cache_key] = result
        # Evict oldest entries if cache exceeds limit
        while len(self._cache) > MAX_CACHE_SIZE:
            self._cache.popitem(last=False)
        logger.info(
            f"Route calculated: {road_distance_km:.1f}km via {road_type} "
            f"| ETA: {eta_minutes:.0f}min | traffic: {traffic_factor}x"
        )
        return result

    def _haversine(self, lat1, lon1, lat2, lon2):
        """Calculate great-circle distance in km."""
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * asin(sqrt(a))
        return 6371 * c

    def _classify_road_type(self, distance_km):
        """Classify the likely road type based on distance."""
        if distance_km < 5:
            return "urban"
        elif distance_km < 15:
            return "suburban"
        else:
            return "highway"

    def _get_traffic_factor(self, distance_km):
        """
        Get traffic factor based on current time and distance.
        Returns a multiplier: 1.0 = free flow, up to 2.0 = heavy congestion.
        """
        hour = datetime.now().hour

        if 8 <= hour <= 10:
            base = 1.5  # morning rush
        elif 17 <= hour <= 20:
            base = 1.6  # evening rush
        elif 12 <= hour <= 14:
            base = 1.2  # lunch
        elif 22 <= hour or hour <= 5:
            base = 0.9  # night (faster than normal)
        else:
            base = 1.1  # normal

        # Add slight randomness for realism
        jitter = random.uniform(-0.05, 0.05)
        # Longer distances are more affected
        distance_mod = 1.0 + (min(distance_km, 20) / 100)

        return round(max(0.8, base * distance_mod + jitter), 2)

    def _calculate_eta(self, road_distance_km, traffic_factor, road_type):
        """Calculate ETA in minutes considering road type and traffic."""
        # Base speeds by road type (km/h) for ambulance with sirens
        speeds = {
            "urban": 35,       # slower in city
            "suburban": 50,    # moderate
            "highway": 70,     # fastest on highways
        }
        base_speed = speeds.get(road_type, 40)

        # Apply traffic factor (higher factor = slower)
        effective_speed = base_speed / traffic_factor

        # Minimum speed (even in worst traffic, ambulance moves)
        effective_speed = max(effective_speed, 15)

        eta = (road_distance_km / effective_speed) * 60
        return max(eta, 1.0)  # minimum 1 minute

    def _generate_waypoints(self, lat1, lng1, lat2, lng2, num_points=5):
        """Generate intermediate waypoints for route visualization."""
        waypoints = []
        for i in range(num_points + 2):
            fraction = i / (num_points + 1)
            lat = lat1 + (lat2 - lat1) * fraction
            lng = lng1 + (lng2 - lng1) * fraction

            # Add slight offset to simulate road (not straight line)
            if 0 < i < num_points + 1:
                offset = random.uniform(-0.002, 0.002)
                lat += offset
                lng += offset * 0.8

            waypoints.append({
                "latitude": round(lat, 6),
                "longitude": round(lng, 6),
            })
        return waypoints

    def _traffic_level_label(self, factor):
        """Convert traffic factor to human-readable label."""
        if factor <= 0.95:
            return "free_flow"
        elif factor <= 1.15:
            return "light"
        elif factor <= 1.35:
            return "moderate"
        elif factor <= 1.55:
            return "heavy"
        else:
            return "severe"

    def _describe_route(self, distance_km, eta_minutes, road_type, traffic_factor):
        """Generate a human-readable route description."""
        traffic_label = self._traffic_level_label(traffic_factor)
        labels = {
            "free_flow": "clear roads",
            "light": "light traffic",
            "moderate": "moderate traffic",
            "heavy": "heavy traffic",
            "severe": "severe congestion",
        }
        traffic_desc = labels.get(traffic_label, "normal traffic")

        return (
            f"{distance_km:.1f} km via {road_type} roads | "
            f"ETA: {eta_minutes:.0f} min | {traffic_desc}"
        )

    def clear_cache(self):
        """Clear the route cache."""
        self._cache.clear()


# Singleton instance
route_optimizer = RouteOptimizer()
