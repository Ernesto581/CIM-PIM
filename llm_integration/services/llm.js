const OpenAI = require('openai');
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

const BASE_URL = process.env.LLM_BASE_URL || 'https://opencode.ai/inference/v1';
const API_KEY = process.env.LLM_API_KEY;
const MODEL = process.env.LLM_MODEL || 'deepseek-v4-pro';
const REASONING_EFFORT = process.env.LLM_REASONING_EFFORT || 'none';

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
  const response = await openai.chat.completions.create(
    {
      model: MODEL,
      reasoning_effort: REASONING_EFFORT,
      temperature,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    },
    {
      headers: {
        'User-Agent': 'jmda-cim-pim/4.0',
        'x-opencode-session': randomUUID()
      }
    }
  );

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('La respuesta del modelo está vacía');
  }
  return content;
}

// Streaming: devuelve un async iterable de fragmentos de texto.
async function* stream({ system, user, temperature = 0.1 }) {
  const openai = getClient();
  const response = await openai.chat.completions.create(
    {
      model: MODEL,
      reasoning_effort: REASONING_EFFORT,
      temperature,
      stream: true,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    },
    {
      headers: {
        'User-Agent': 'jmda-cim-pim/4.0',
        'x-opencode-session': randomUUID()
      }
    }
  );

  for await (const chunk of response) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) yield delta;
  }
}

module.exports = { generate, stream, getModel: () => MODEL };
