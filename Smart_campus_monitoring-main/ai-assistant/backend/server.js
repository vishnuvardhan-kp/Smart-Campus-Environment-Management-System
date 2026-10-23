import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import healthRoutes from './routes/health.routes.js';
import assistantRoutes from './routes/assistant.routes.js';
import { connectToDatabase } from './services/campusDataService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env relative to server.js directory
dotenv.config({ path: path.join(__dirname, '.env') });
// Fallback: Also load backend/.env if available
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const app = express();
const PORT = process.env.PORT || 5005;
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Safe CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      origin === CORS_ORIGIN ||
      origin === 'http://localhost:5173' ||
      origin === 'http://localhost:5175' ||
      origin === 'http://127.0.0.1:5173' ||
      origin === 'http://127.0.0.1:5175' ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '64kb' }));

// Routes
app.use('/api', healthRoutes);
app.use('/api/assistant', assistantRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err.message);
  res.status(500).json({
    error: 'Internal server error'
  });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`[Assistant Backend] Running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`[Assistant Backend] Health check: http://localhost:${PORT}/api/health`);
  console.log(`[Assistant Backend] Chat endpoint: http://localhost:${PORT}/api/assistant/chat`);

  // Pre-warm database asynchronously without blocking HTTP server availability
  connectToDatabase()
    .then(() => console.log('[Assistant Backend] Database pre-warmed successfully.'))
    .catch((err) => console.warn('[Assistant Backend] Database pre-warm warning:', err.message));
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Assistant Backend Error] Port ${PORT} is already in use by another process.`);
    process.exit(1);
  } else {
    console.error(`[Assistant Backend Error]`, err.message);
  }
});
