const path = require('path');
const mqtt = require('mqtt');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const brokerUrl = process.env.MQTT_BROKER_URL;
const options = {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  port: parseInt(process.env.MQTT_PORT) || 8883,
  protocol: 'mqtts',
  rejectUnauthorized: false
};

console.log('[ESP32 Simulator] Connecting to HiveMQ MQTT broker...');
const client = mqtt.connect(brokerUrl, options);

const SIMULATED_ROOMS = [
  { room: 'LAB101', baseTemp: 24.5, baseHum: 55, tempAmp: 2.0, humAmp: 4 },
  { room: 'LAB102', baseTemp: 26.0, baseHum: 58, tempAmp: 1.8, humAmp: 5 },
  { room: 'SEMINAR_HALL', baseTemp: 22.0, baseHum: 50, tempAmp: 1.5, humAmp: 3 },
  { room: 'LIBRARY', baseTemp: 23.0, baseHum: 52, tempAmp: 1.2, humAmp: 3 },
  { room: 'SERVER_ROOM', baseTemp: 20.5, baseHum: 45, tempAmp: 2.2, humAmp: 4 }
];

client.on('connect', () => {
  console.log('[ESP32 Simulator] Connected to broker successfully!');
  console.log(`[ESP32 Simulator] Simulating ${SIMULATED_ROOMS.length} campus zones...`);
  
  // Publish telemetry every 5 seconds
  let count = 0;
  setInterval(() => {
    count++;
    SIMULATED_ROOMS.forEach((item, idx) => {
      const tempOffset = Math.sin((count + idx) * 0.2) * item.tempAmp;
      const humOffset = Math.cos((count + idx) * 0.2) * item.humAmp;
      const temp = Number((item.baseTemp + tempOffset).toFixed(1));
      const hum = Math.round(item.baseHum + humOffset);
      const people = item.room === 'SEMINAR_HALL' ? 18 : (item.room === 'SERVER_ROOM' ? 0 : 5);
      const fan = temp >= 26.5 ? 'ON' : 'OFF';
      const light = people > 0 ? 'ON' : 'OFF';

      const payload = JSON.stringify({
        room: item.room,
        temperature: temp,
        humidity: hum,
        peopleCount: people,
        light: light,
        fan: fan,
        systemStatus: 'Connected'
      });

      client.publish(`campus/environment/${item.room}`, payload, { qos: 0 }, (err) => {
        if (err) {
          console.error(`[ESP32 Simulator] Publish error for ${item.room}:`, err.message);
        }
      });
    });

    console.log(`[ESP32 Simulator #${count}] Dispatched telemetry for ${SIMULATED_ROOMS.length} rooms at ${new Date().toLocaleTimeString()}`);
  }, 5000);
});

client.on('error', (err) => {
  console.error('[ESP32 Simulator] MQTT Connection Error:', err);
});

