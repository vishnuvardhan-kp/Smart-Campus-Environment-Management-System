const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const initMqttSubscriber = require('./mqtt/subscriber');
const sensorRoutes = require('./routes/sensorRoutes');
const environmentRoutes = require('./routes/environmentRoutes');

// 1. Load dotenv
dotenv.config({ path: path.join(__dirname, '.env') });


// 2. Connect MongoDB
connectDB();

// 3. Initialize Express app
const app = express();

// 4. Middlewares
app.use(cors());
app.use(express.json());

// 5. Health Check Endpoint (GET /)
app.get('/', (req, res) => {
    res.status(200).json({ status: 'running' });
});

// 6. Register API routes
app.use('/api/environment', environmentRoutes);
app.use('/api/sensor', sensorRoutes);

// 7. Start MQTT Subscriber
initMqttSubscriber();

// 8. Start Express Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`[Server] Backend server running on port ${PORT}`);
});
