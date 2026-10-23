import { processAssistantRequest } from '../services/assistantService.js';

const MAX_MESSAGE_LENGTH = 500;

export async function handleChatMessage(req, res) {
  try {
    const { message } = req.body;

    // 1. Validation: presence and type check
    if (message === undefined || message === null || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Invalid request: "message" field is required and must be a string.'
      });
    }

    const trimmed = message.trim();

    // 2. Validation: empty message
    if (trimmed.length === 0) {
      return res.status(400).json({
        error: 'Message cannot be empty.'
      });
    }

    // 3. Validation: length constraint
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `Message exceeds maximum allowed length of ${MAX_MESSAGE_LENGTH} characters.`
      });
    }

    // 4. Process assistant request grounded in MongoDB
    const responsePayload = await processAssistantRequest(trimmed);

    return res.status(200).json({
      ...responsePayload,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Assistant Controller Error]:', error.message);
    return res.status(500).json({
      error: 'An internal error occurred while processing the assistant request. Please verify MongoDB connectivity.',
      details: error.message
    });
  }
}
