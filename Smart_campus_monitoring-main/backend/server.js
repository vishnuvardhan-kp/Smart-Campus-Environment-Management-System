const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const initMqttSubscriber = require('./mqtt/subscriber');
const sensorRoutes = require('./routes/sensorRoutes');
const environmentRoutes = require('./routes/environmentRoutes');
const faultRoutes = require('./routes/faultRoutes');
const alertRoutes = require('./routes/alertRoutes');
const { initAlertService } = require('./services/alerts/alertIncidentService');

// 1. Load dotenv
dotenv.config({ path: path.join(__dirname, '.env') });

// 2. Connect MongoDB asynchronously
connectDB().then(() => {
    initAlertService();
}).catch(() => {});

// 3. Initialize Express app
const app = express();

// 4. Middlewares
app.use(cors());
app.use(express.json());

// 5. Start MQTT Subscriber asynchronously
const mqttClient = initMqttSubscriber();

// 6. Health Check Endpoint (GET /)
app.get('/', (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    const isMqttConnected = Boolean(mqttClient && mqttClient.connected);
    res.status(200).json({
        status: 'running',
        service: 'smart-campus-backend',
        database: {
            connected: isDbConnected,
            host: mongoose.connection.host || null
        },
        mqtt: {
            connected: isMqttConnected
        }
    });
});

// 7. Register API routes
app.use('/api/environment', environmentRoutes);
app.use('/api/sensor', sensorRoutes);
app.use('/api/faults', faultRoutes);
app.use('/api/alerts', alertRoutes);

// 8. Start Express Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`[Server] Backend server running on port ${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`[Server Error] Port ${PORT} is already in use by another process.`);
        process.exit(1);
    } else {
        console.error(`[Server Error]`, err.message);
    }
});
