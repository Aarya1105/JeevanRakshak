# 🚑 Golden Hour Emergency Triage System
AI-Powered Healthcare Decision Support & Hospital Optimization Platform
---
## 🧠 Overview
**Golden Hour Emergency Triage System** is an intelligent full-stack healthcare platform designed to assist emergency responders in making **life-critical decisions within the golden hour** — the most important time after a medical emergency.

The system combines:
* 🤖 **AI Severity Prediction**
* ⚙️ **Constraint Optimization**
* 🗺️ **Live Hospital Dashboard**
* 🚑 **Ambulance Routing Simulation**

to automatically recommend the **best hospital** for a patient based on medical condition, hospital capacity, and travel efficiency.

---

## 🎯 Problem Statement

During emergencies, patients are often taken to **overloaded hospitals**, causing:

* Delayed treatment
* ICU shortages
* Ambulance rerouting
* Increased mortality risk

This project solves the problem using **AI + Optimization + Real-time Visualization**.

---

## ✨ Key Features

### 🧠 AI Patient Severity Prediction

* Predicts emergency severity using patient vitals:

  * Age
  * Heart Rate
  * Blood Pressure
  * SpO₂
  * Temperature
  * Symptoms
* Automatically determines:

  * ICU Requirement
  * Ventilator Requirement
  * Required Specialist

Model Used:

* **XGBoost Classifier**
* Auto-training with synthetic dataset

---

### ⚙️ Smart Hospital Optimization Engine

Selects the **best hospital** using:

✅ Travel Time
✅ Hospital Load
✅ ICU Availability
✅ Ventilator Availability
✅ Specialist Matching

Optimization powered by:

* **Google OR-Tools Constraint Solver**

---

### 🗺️ Live Emergency Dashboard

Interactive real-time map built with **Leaflet.js**

Features:

* Patient location visualization
* Hospital markers
* Load color coding:

  * 🟢 Low Load
  * 🟡 Medium Load
  * 🔴 High Load
* Auto refresh every 5 seconds
* Ambulance movement simulation

---

### 📊 AI Explainability Panel

Shows decision transparency:

* Why hospital was selected
* Travel time analysis
* Resource availability
* AI severity reasoning

---

## 🏗️ Project Architecture

```
Patient Input
     ↓
AI Severity Prediction
     ↓
Constraint Optimization Engine
     ↓
Best Hospital Selection
     ↓
Live Map Dashboard
```

---

## 📁 Project Structure

```
project/
│
├── app.py
├── train_model.py
├── optimizer.py
├── predict.py
├── hospitals.py
├── severity_model.pkl
│
├── templates/
│   ├── patient_form.html
│   └── dashboard.html
│
├── static/
│   ├── style.css
│   └── script.js
│
└── requirements.txt
```

---

## ⚙️ Tech Stack

### Backend

* Python
* Flask
* Scikit-learn
* XGBoost
* OR-Tools
* Joblib

### Frontend

* HTML5
* CSS3
* JavaScript
* Leaflet.js Maps

### AI & Optimization

* Machine Learning Severity Prediction
* Constraint Optimization Algorithms

---

## 🚀 Installation & Setup

### 1️⃣ Clone Repository

```bash
git clone https://github.com/yourusername/golden-hour-triage.git
cd golden-hour-triage
```

---

### 2️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

---

### 3️⃣ Run Application

```bash
python app.py
```

---

### 4️⃣ Open Browser

```
http://127.0.0.1:5000
```

---

## 🤖 AI Model Training

The system automatically trains a model if:

```
severity_model.pkl
```

does not exist.

Synthetic dataset includes:

* Heart Rate (60–150)
* SpO₂ (70–100)
* Blood Pressure (80–180)
* Temperature (97–104)
* Age (1–90)

No manual training required ✅

---

## 🗺️ Dashboard Capabilities

* Real-time hospital load simulation
* Live optimization updates
* Ambulance route visualization
* Emergency decision transparency

---

## 🎯 Use Cases

* Smart City Emergency Systems
* Ambulance Dispatch Centers
* Disaster Management
* Hospital Load Balancing
* AI Healthcare Research

---

## 🏆 Hackathon Value Proposition

✅ AI + Optimization + Visualization
✅ Real-World Healthcare Impact
✅ Explainable AI Decisions
✅ Scalable Architecture
✅ Production-Ready Concept

---

## 🔮 Future Enhancements

* Live GPS Ambulance Tracking
* Mass Casualty Mode
* Voice Emergency Assistant
* Agentic AI Dispatcher
* Real Hospital API Integration
* Mobile Application

---

## 👩‍💻 Team

**HackVortex**

* Hemangi Mahajan
* Vasundhara Dongre
* Reeya Pawar
* Aarya Jadhav

## ❤️ Acknowledgements

Inspired by the importance of the **Golden Hour** in emergency medicine and the need for intelligent healthcare infrastructure.

