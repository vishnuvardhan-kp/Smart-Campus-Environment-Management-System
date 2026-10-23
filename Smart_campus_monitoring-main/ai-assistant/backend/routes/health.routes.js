import { Router } from 'express';
import { getDatabaseHealth } from '../services/campusDataService.js';

const router = Router();

router.get('/health', async (req, res) => {
  const dbHealth = await getDatabaseHealth();
  const hasNvidiaKey = Boolean(process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_KEY.trim());
  const nvidiaModel = process.env.NVIDIA_MODEL || 'meta/llama-3.1-8b-instruct';

  const overallOk = dbHealth.connected;

  res.status(overallOk ? 200 : 503).json({
    status: overallOk ? 'ok' : 'degraded',
    service: 'smart-campus-assistant-backend',
    database: {
      connected: dbHealth.connected,
      name: dbHealth.database,
      currentEnvironmentRecords: dbHealth.currentCount,
      historyRecords: dbHealth.historyCount,
      error: dbHealth.error
    },
    llm: {
      provider: 'NVIDIA NIM',
      model: nvidiaModel,
      apiKeyConfigured: hasNvidiaKey,
      mode: hasNvidiaKey ? 'NVIDIA LLM' : 'Deterministic Rules Engine (Fallback)'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
