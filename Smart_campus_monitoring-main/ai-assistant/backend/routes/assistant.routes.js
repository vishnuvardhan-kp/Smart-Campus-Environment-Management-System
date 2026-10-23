import { Router } from 'express';
import { handleChatMessage } from '../controllers/assistant.controller.js';

const router = Router();

router.post('/chat', handleChatMessage);

export default router;
