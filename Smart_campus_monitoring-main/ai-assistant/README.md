# Smart Campus AI Assistant (Database-Grounded & NVIDIA NIM)

A production-grade, conversational environmental intelligence assistant grounded in actual **MongoDB** sensor telemetry and powered by the **NVIDIA NIM** LLM API.

---

## 🔒 Git & System Safety Guarantee

- **Local Git Isolation**: The entire `ai-assistant/` directory is locally ignored via `.git/info/exclude`.
- **Zero Modifications to Existing Code**: The main React dashboard (`frontend/`), Express server (`backend/`), ESP32 firmware (`esp32/`), and shared `.gitignore` remain **100% untouched**.
- **Preserved Uncommitted Changes**: Your existing uncommitted changes in `esp32/smart_campus/smart_campus.ino` are intact.

---

## 🤖 Selected NVIDIA NIM Configuration

The assistant is configured to use the official NVIDIA API Catalog OpenAI-compatible endpoint:

- **Provider**: NVIDIA NIM API
- **Endpoint**: `https://integrate.api.nvidia.com/v1/chat/completions`
- **Default Model**: `meta/llama-3.1-8b-instruct`
  - *Why selected:* Fast token generation, strict adherence to system grounding rules, low latency, and supported on NVIDIA free developer trial tiers.
  - *Alternative Models supported:* `meta/llama-3.3-70b-instruct` or `mistralai/mistral-7b-instruct-v0.3` (configurable via `NVIDIA_MODEL`).

### How to Configure Your NVIDIA API Key:
1. Obtain an API key from the [NVIDIA Build Portal](https://build.nvidia.com/) (starts with `nvapi-...`).
2. Open `ai-assistant/backend/.env`:
   ```env
   NVIDIA_API_KEY=nvapi-your-key-here
   ```
3. Restart the backend (`npm run dev`).

*(Note: If no API key is configured or if NVIDIA rate limits occur, the assistant automatically falls back to its deterministic condition and trend engine without crashing or fabricating data).*

---

## 🍃 MongoDB Grounding & Sensor Semantics

All factual environmental responses are queried directly from MongoDB:

1. **Current Readings (`current_environment`)**:
   - Queries `room: "LAB101"` in collection `current_environment`.
   - Fields: `temperature` (32°C), `humidity` (57.3%), `peopleCount` (70), `fan` (ON), `light` (ON), `systemStatus`, `lastUpdated`.
   - Data Freshness: If telemetry is older than 15 minutes, the assistant flags it as persisted data with the exact timestamp.
2. **Historical Analysis & Trends (`environment_history`)**:
   - Queries historical points from `environment_history` indexed by `{ room: 1, timestamp: -1 }`.
   - Computes real mathematical averages, minimums, maximums, peak thermal timestamps, and directional trends (`RISING`, `FALLING`, `STABLE`).
3. **IR Sensor Semantics (Pin 27)**:
   - The hardware uses a digital IR obstacle/beam-break sensor (HW-201 on Pin 27).
   - In firmware (`smart_campus.ino`), it triggers on beam interruption with a 1000ms debounce and increments a cumulative trigger counter (`peopleCount`).
   - The assistant clarifies that this represents **cumulative passage/motion trigger occurrences**, not a bidirectional verified net room headcount.

---

## 🚀 Quick Start (Running Independently)

### 1. Start the Assistant Backend (Port 5005)
```bash
cd ai-assistant/backend
npm install
npm run dev
```

### 2. Start the Assistant Frontend (Port 5175)
In a separate terminal:
```bash
cd ai-assistant/frontend
npm install
npm run dev
```
Open **`http://localhost:5175`** in your browser.

---

## 📡 API Endpoints

### 1. Health & Connection Status
- **`GET /api/health`**
- Returns real-time MongoDB connection state, document counts, and active LLM configuration without exposing secrets:
```json
{
  "status": "ok",
  "service": "smart-campus-assistant-backend",
  "database": {
    "connected": true,
    "name": "smart_campus",
    "currentEnvironmentRecords": 1,
    "historyRecords": 208
  },
  "llm": {
    "provider": "NVIDIA NIM",
    "model": "meta/llama-3.1-8b-instruct",
    "apiKeyConfigured": true
  }
}
```

### 2. Chat Query
- **`POST /api/assistant/chat`**
- Body:
```json
{
  "message": "What is the current temperature in LAB101?"
}
```
- Returns natural language response, structured metrics, assessment, and database provenance.
