import { handleAgentMessage } from '../agent/agentService.js';
import { resetSession } from '../agent/sessionStore.js';
import { ApiError } from '../utils/ApiError.js';

export async function sendMessage(req, res) {
  const { sessionId, text, state } = req.body;
  if (!sessionId) {
    throw new ApiError('sessionId es requerido', { source: 'agentController', statusCode: 400 });
  }
  const result = await handleAgentMessage(sessionId, text, state);
  res.json({ status: 'success', data: result });
}

export async function endSession(req, res) {
  resetSession(req.params.sessionId);
  res.json({ status: 'success' });
}
