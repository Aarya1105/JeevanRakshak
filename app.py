from flask import Flask, render_template

app = Flask(__name__)

# Dashboard page
@app.route("/")
def dashboard():
    return render_template("dashboard.html")

# Live Map page
@app.route("/live-map")
def live_map():
    return render_template("map.html")

if __name__ == "__main__":
    app.run(debug=True)