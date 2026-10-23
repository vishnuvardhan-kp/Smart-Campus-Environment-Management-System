# Smart Campus IoT Environmental Management System & Digital Twin

An enterprise IoT smart campus environmental monitoring platform featuring a real-time **Interactive Campus Digital Twin**, **Actuator Automation**, and an automated **Sensor Fault & Anomaly Detection Engine**.

---

## 🏛️ System Architecture

```
[ ESP32 Hardware / Multi-Room Simulator ]
     │ (DHT11, IR Occupancy, Relays)
     ▼
[ HiveMQ Cloud MQTT Broker (MQTTS:8883) ]
     │
     ▼
[ Node.js / Express Backend Engine ]
  ├── In-Memory Real-Time State Cache + MongoDB Persistence
  ├── Environment Assessment & 20-Min Window Trend Service
  └── Sensor Fault & Anomaly Detection Engine
     │
     ▼
[ React + Vite Digital Twin Frontend ]
  ├── 2.5D Interactive Campus Map (SVG)
  ├── Block A Architectural Blueprint Floor Plan (Animated Relays & Occupancy)
  ├── Room Inspector Drawer
  └── Sensor Health & Diagnostics Center (/alerts, /monitoring)
```

---

## ✨ Key Features

### 1. Interactive Campus Digital Twin
* **2.5D Master Campus Overview (`/buildings`):** Custom SVG map displaying Block A, Block B, Library, Central Quad, and the IoT Gateway. Dynamically color-graded based on campus thermal comfort:
  * ❄️ **Cool:** $< 22^\circ\text{C}$ (Cyan/Blue)
  * 🟢 **Normal / Optimal:** $22 - 26^\circ\text{C}$ (Emerald Green)
  * 🟡 **Warning:** $27 - 29^\circ\text{C}$ (Amber Yellow)
  * 🔴 **Critical:** $\ge 30^\circ\text{C}$ (Ruby Red)
  * ⚫ **Offline / Missing:** Grey
* **Block A Architectural Floor Plan:** 2D architectural blueprint layout mapping active rooms:
  * `LAB101`
  * `LAB102`
  * `SEMINAR_HALL`
  * `LIBRARY`
  * `SERVER_ROOM`
* **Real-Time Actuator Feedback:**
  * 🌀 **Cooling Fan:** Spins dynamically when the cooling relay is active (`fan: "ON"`).
  * 💡 **Illuminated Lighting:** Subtle glowing bulb icon when the lighting relay is active (`light: "ON"`).
  * 👥 **Occupancy:** Real-time occupancy counters per zone.
* **Room Inspector Panel:** Slide-out drawer showing live telemetry, hardware diagnostic health, environmental assessments, and direct links to room analytics.

---

### 2. Sensor Fault and Anomaly Detection Engine
Automated backend detection engine (`backend/services/sensorFaultDetection.js`) evaluating telemetry non-destructively:
* **Device Offline Detection:** Flags ESP32 nodes when no telemetry arrives within the timeout period.
* **Sudden Temperature Jump Detection:** Detects abnormal rate-of-change and sudden thermal spikes.
* **Implausible Telemetry Protection:** Intercepts out-of-range sensor values (e.g. DHT11 limits: 0–50°C, 20–90% RH) or corrupted JSON, storing faults without overwriting valid environmental readings.
* **Stuck Sensor Detection:** Flags sensors reporting invariant readings over an extended period.
* **Threshold Prediction:** Early-warning forecasting identifying rooms trending toward critical thresholds before violations occur.
* **Automatic Fault Resolution:** Resolves active faults and records resolution timestamps when valid telemetry resumes.

---

## 🚀 Quick Start Guide

### Prerequisites
* Node.js 18+ installed
* Git

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/shreenidhi-2406/Smart_campus_monitoring.git
cd Smart_campus_monitoring

# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Configure Environment Variables
Copy `.env.example` templates in both `backend` and `frontend`:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` with your HiveMQ MQTT and MongoDB connection details:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/smart_campus
MQTT_BROKER_URL=mqtts://<your-hivemq-broker>.s1.eu.hivemq.cloud:8883
MQTT_USERNAME=<your-username>
MQTT_PASSWORD=<your-password>
ESP32_ROOM=LAB101
```

### 3. Run the System

#### Unified Development Startup (Recommended):
```bash
npm run dev
```
Starts all three core services concurrently in a single terminal with colored labeling, pre-flight port safety checks, and unified graceful shutdown:
* 🖥️ **Frontend Dashboard:** `http://localhost:5173`
* ⚙️ **Main Backend API:** `http://localhost:5000`
* 🤖 **AI Assistant API:** `http://localhost:5005`

#### Or Run Services Individually:
* **Terminal 1 — Main Backend Server:** `npm run backend` (`http://localhost:5000`)
* **Terminal 2 — AI Assistant Backend:** `npm run assistant` (`http://localhost:5005`)
* **Terminal 3 — Frontend Dev Server:** `npm run frontend` (`http://localhost:5173`)
* **Terminal 4 — Telemetry Simulator (Optional / Demo Mode):** `npm run simulate`

---

## 📡 API Endpoints

### Environmental Data
* `GET /api/environment/current` — Returns latest valid telemetry for all rooms enriched with assessments, 20-minute trends, and sensor health status.
* `GET /api/environment/history/:room` — Historical telemetry records for charting and analytics.

### Sensor Faults & Health
* `GET /api/faults/health` — Campus-wide hardware health KPIs (online, stale, offline, degraded, fault counts).
* `GET /api/faults/active` — Currently active faults and anomalies.
* `GET /api/faults/history` — Complete audit trail of resolved and historical faults.
* `GET /api/faults/room/:room` — Fault history filtered by room.

---

## 🧪 Automated Test Suite
Run the test suites across all 7 phases:
```bash
# Sensor fault detection engine tests
node backend/test_sensorFaultDetection.js

# Sensor health & fault API tests
node backend/test_faultApi.js

# Complete end-to-end scenario verification
node backend/test_e2e_scenarios.js
```
*All 80/80 automated test cases pass.*

---

## 📄 License
ISC
