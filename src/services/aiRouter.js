require('dotenv').config();

// Track provider status to implement circuit breaking
const providerStatus = {
  groq: { isExhausted: false, exhaustedAt: null },
  gemini: { isExhausted: false, exhaustedAt: null },
  mistral: { isExhausted: false, exhaustedAt: null },
  cohere: { isExhausted: false, exhaustedAt: null },
  openrouter: { isExhausted: false, exhaustedAt: null },
};

const EXHAUST_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

// Check and reset exhausted status if timeout has passed
function checkExhausted(provider) {
  const status = providerStatus[provider];
  if (status.isExhausted && (Date.now() - status.exhaustedAt > EXHAUST_TIMEOUT_MS)) {
    status.isExhausted = false;
    status.exhaustedAt = null;
  }
  return status.isExhausted;
}

function markExhausted(provider) {
  console.warn(`[AI Router] Provider ${provider} marked as EXHAUSTED.`);
  providerStatus[provider].isExhausted = true;
  providerStatus[provider].exhaustedAt = Date.now();
}

// ------------------------------------------------------------------
// Model API Callers
// ------------------------------------------------------------------

async function callOpenRouterWithModel(modelName, messages, systemPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error(`Missing OPENROUTER_API_KEY for fallback to ${modelName}`);

  console.log(`[AI Router] Attempting fallback to OpenRouter model '${modelName}'`);
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 1024,
      temperature: 0.7
    })
  });

  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter Error calling ${modelName}: ${res.status} ${res.statusText} (${text})`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGroq(messages, systemPrompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 1024
    })
  });

  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) throw new Error(`Groq Error: ${res.statusText}`);

  const data = await res.json();
  return data.choices[0].message.content;
}

async function callMistral(messages, systemPrompt) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("Missing MISTRAL_API_KEY");

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.8,
    })
  });

  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) throw new Error(`Mistral Error: ${res.statusText}`);

  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGemini(messages, systemPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[AI Router] Missing GEMINI_API_KEY. Falling back to OpenRouter.");
    return await callOpenRouterWithModel("google/gemini-2.5-flash", messages, systemPrompt);
  }

  // Format messages for Gemini
  const geminiMessages = messages.map(m => ({
    role: m.role === 'ai' ? 'model' : m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const payload = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: geminiMessages,
    generationConfig: { temperature: 0.7 }
  };

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.status === 429) {
      console.warn("[AI Router] Gemini API Quota Exceeded/Rate Limited. Falling back to OpenRouter.");
      return await callOpenRouterWithModel("google/gemini-2.5-flash", messages, systemPrompt);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Status ${res.status}: ${res.statusText} (${text})`);
    }

    const data = await res.json();
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
    }
    throw new Error("Empty response from Gemini");
  } catch (error) {
    console.error(`[AI Router] callGemini direct call failed (${error.message}). Falling back to OpenRouter.`);
    return await callOpenRouterWithModel("google/gemini-2.5-flash", messages, systemPrompt);
  }
}

async function callCohere(messages, systemPrompt) {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) {
    console.warn("[AI Router] Missing COHERE_API_KEY. Falling back to OpenRouter.");
    return await callOpenRouterWithModel("cohere/command-r7b-12-2024", messages, systemPrompt);
  }

  try {
    const res = await fetch("https://api.aimlapi.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "command-a",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (res.status === 429 || res.status === 403 || res.status === 401) {
      console.warn(`[AI Router] Cohere AI/ML API failed with status ${res.status}. Falling back to OpenRouter.`);
      return await callOpenRouterWithModel("cohere/command-r7b-12-2024", messages, systemPrompt);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Status ${res.status}: ${res.statusText} (${text})`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error(`[AI Router] callCohere direct call failed (${error.message}). Falling back to OpenRouter.`);
    return await callOpenRouterWithModel("cohere/command-r7b-12-2024", messages, systemPrompt);
  }
}

async function callOpenRouter(messages, systemPrompt) {
  return await callOpenRouterWithModel("openai/gpt-3.5-turbo", messages, systemPrompt);
}

const PROVIDERS = {
  groq: callGroq,
  gemini: callGemini,
  mistral: callMistral,
  cohere: callCohere,
  openrouter: callOpenRouter
};

// ------------------------------------------------------------------
// Semantic Routing Maps
// ------------------------------------------------------------------

// Map emotions to a priority list of providers
const EMOTION_TO_PROVIDERS = {
  default: ['groq', 'gemini', 'mistral', 'cohere', 'openrouter'], // Groq priority for analytical/default
  greetings: ['groq', 'gemini', 'mistral', 'cohere', 'openrouter'], 
  sad: ['gemini', 'groq', 'mistral', 'cohere', 'openrouter'],      // Gemini priority for empathy
  love: ['gemini', 'groq', 'mistral', 'cohere', 'openrouter'],
  angry: ['mistral', 'gemini', 'groq', 'cohere', 'openrouter'],    // Mistral priority for unhinged/angry
  playful: ['mistral', 'gemini', 'groq', 'cohere', 'openrouter'],
  unhinged: ['mistral', 'gemini', 'groq', 'cohere', 'openrouter'],
  curious: ['cohere', 'groq', 'gemini', 'mistral', 'openrouter'],  // Cohere priority for research/questions
};

/**
 * Main router function
 * @param {string} emotion - The detected emotion from user input
 * @param {Array} messages - Chat history array [{role, content}]
 * @param {string} systemPrompt - Base system instructions
 */
async function generateAiResponse(emotion, messages, systemPrompt) {
  const priorityList = EMOTION_TO_PROVIDERS[emotion] || EMOTION_TO_PROVIDERS.default;

  for (const providerName of priorityList) {
    if (checkExhausted(providerName)) {
      console.log(`[AI Router] Skipping ${providerName} (exhausted)`);
      continue;
    }

    try {
      console.log(`[AI Router] Attempting to generate with ${providerName} for emotion '${emotion}'`);
      const response = await PROVIDERS[providerName](messages, systemPrompt);
      console.log(`[AI Router] SUCCESS with ${providerName}`);
      return response;
    } catch (error) {
      console.error(`[AI Router] FAILED with ${providerName}: ${error.message}`);
      if (error.message === "RATE_LIMIT") {
        markExhausted(providerName);
      }
      // Continue to the next provider in the loop
    }
  }

  throw new Error("All AI providers exhausted or failed.");
}

module.exports = { generateAiResponse };
