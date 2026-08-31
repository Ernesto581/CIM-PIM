const OpenAI = require('openai');
const logger = require('../utils/logger');

const BASE_URL = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
const API_KEY = process.env.LLM_API_KEY;
const MODEL = process.env.LLM_MODEL || 'gpt-4o';

let client = null;

function getClient() {
  if (!API_KEY) {
    throw new Error('LLM_API_KEY no está configurado (ver llm_integration/.env)');
  }
  if (!client) {
    client = new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL });
  }
  return client;
}

async function generate({ system, user, temperature = 0.1 }) {
  const openai = getClient();
  const response = await openai.chat.completions.create({
    model: MODEL,
    temperature,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('La respuesta del modelo está vacía');
  }
  return content;
}

module.exports = { generate, getModel: () => MODEL };
