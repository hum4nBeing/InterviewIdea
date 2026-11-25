import { GoogleGenAI } from '@google/genai';

const EPHEMERAL_API_VERSION = 'v1alpha';
const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes max session duration
const NEW_SESSION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes to establish WebSocket

/**
 * Mints a single-use Gemini Live API ephemeral auth token on the server and
 * returns the constrained WebSocket URL so the master API key stays secret.
 */
export async function createEphemeralWsUrl(): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }

  const ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: { apiVersion: EPHEMERAL_API_VERSION },
  });

  const now = Date.now();
  const expireTime = new Date(now + TOKEN_TTL_MS).toISOString();
  const newSessionExpireTime = new Date(now + NEW_SESSION_WINDOW_MS).toISOString();

  const token = await ai.authTokens.create({
    config: {
      uses: 1,
      expireTime,
      newSessionExpireTime,
    },
  });

  if (!token.name) {
    throw new Error('Failed to obtain ephemeral auth token name from Gemini API');
  }

  return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.${EPHEMERAL_API_VERSION}.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(token.name)}`;
}
