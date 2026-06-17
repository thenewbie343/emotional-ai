require('dotenv').config();

// Track provider status to implement circuit breaking
const providerStatus = {
  groq: { isExhausted: false, exhaustedAt: null },
  gemini: { isExhausted: false, exhaustedAt: null },
  mistral: { isExhausted: false, exhaustedAt: null },
  cohere: { isExhausted: false, exhaustedAt: null },
  nvidia: { isExhausted: false, exhaustedAt: null },
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
    }),
    signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined
  });

  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter Error calling ${modelName}: ${res.status} ${res.statusText} (${text})`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGroq(messages, systemPrompt, isSai) {
  const apiKey = isSai ? process.env.SAI_GROQ_API_KEY : process.env.GROQ_API_KEY;
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
    }),
    signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined
  });

  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) throw new Error(`Groq Error: ${res.statusText}`);

  const data = await res.json();
  return data.choices[0].message.content;
}

async function callMistral(messages, systemPrompt, isSai) {
  const apiKey = isSai ? process.env.SAI_MISTRAL_API_KEY : process.env.MISTRAL_API_KEY;
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
    }),
    signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined
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
    return await callOpenRouterWithModel("google/gemma-4-31b-it:free", messages, systemPrompt);
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
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined
    });

    if (res.status === 429) {
      console.warn("[AI Router] Gemini API Quota Exceeded/Rate Limited. Falling back to OpenRouter.");
      return await callOpenRouterWithModel("google/gemma-4-31b-it:free", messages, systemPrompt);
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
    return await callOpenRouterWithModel("google/gemma-4-31b-it:free", messages, systemPrompt);
  }
}

async function callCohere(messages, systemPrompt) {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) {
    console.warn("[AI Router] Missing COHERE_API_KEY. Falling back to OpenRouter.");
    return await callOpenRouterWithModel("google/gemma-4-31b-it:free", messages, systemPrompt);
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
      }),
      signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined
    });

    if (res.status === 429 || res.status === 403 || res.status === 401) {
      console.warn(`[AI Router] Cohere AI/ML API failed with status ${res.status}. Falling back to OpenRouter.`);
      return await callOpenRouterWithModel("google/gemma-4-31b-it:free", messages, systemPrompt);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Status ${res.status}: ${res.statusText} (${text})`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error(`[AI Router] callCohere direct call failed (${error.message}). Falling back to OpenRouter.`);
    return await callOpenRouterWithModel("google/gemma-4-31b-it:free", messages, systemPrompt);
  }
}

async function callNvidia(messages, systemPrompt) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.warn("[AI Router] Missing NVIDIA_API_KEY. Falling back to OpenRouter.");
    return await callOpenRouter(messages, systemPrompt);
  }

  // Ensure the nvapi- prefix is present
  const formattedKey = apiKey.startsWith("nvapi-") ? apiKey : `nvapi-${apiKey}`;

  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${formattedKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-8b-instruct", // Fast and lightweight NIM model
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.7,
        max_tokens: 1024
      }),
      signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined
    });

    if (res.status === 429 || res.status === 403 || res.status === 401) {
      console.warn(`[AI Router] NVIDIA NIM API failed with status ${res.status}. Falling back to OpenRouter.`);
      return await callOpenRouter(messages, systemPrompt);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Status ${res.status}: ${res.statusText} (${text})`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error(`[AI Router] callNvidia direct call failed (${error.message}). Falling back to OpenRouter.`);
    return await callOpenRouter(messages, systemPrompt);
  }
}

async function callOpenRouter(messages, systemPrompt) {
  try {
    return await callOpenRouterWithModel("google/gemma-4-31b-it:free", messages, systemPrompt);
  } catch (error) {
    console.warn(`[AI Router] OpenRouter google/gemma-4-31b-it:free failed (${error.message}). Falling back to openai/gpt-oss-120b:free.`);
    return await callOpenRouterWithModel("openai/gpt-oss-120b:free", messages, systemPrompt);
  }
}

const PROVIDERS = {
  groq: callGroq,
  gemini: callGemini,
  mistral: callMistral,
  cohere: callCohere,
  nvidia: callNvidia,
  openrouter: callOpenRouter
};

// ------------------------------------------------------------------
// Semantic Routing Maps
// ------------------------------------------------------------------

const { createClient } = require('@supabase/supabase-js');
const posthog = require('../posthog');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Map emotions to a priority list of providers
const EMOTION_TO_PROVIDERS = {
  default: ['groq', 'gemini', 'mistral', 'cohere', 'nvidia', 'openrouter'], // Groq priority for analytical/default
  greetings: ['groq', 'gemini', 'mistral', 'cohere', 'nvidia', 'openrouter'], 
  sad: ['gemini', 'groq', 'mistral', 'cohere', 'nvidia', 'openrouter'],      // Gemini priority for empathy
  love: ['gemini', 'groq', 'mistral', 'cohere', 'nvidia', 'openrouter'],
  angry: ['mistral', 'gemini', 'groq', 'cohere', 'nvidia', 'openrouter'],    // Mistral priority for unhinged/angry
  playful: ['mistral', 'gemini', 'groq', 'cohere', 'nvidia', 'openrouter'],
  unhinged: ['mistral', 'gemini', 'groq', 'cohere', 'nvidia', 'openrouter'],
  curious: ['cohere', 'groq', 'gemini', 'mistral', 'nvidia', 'openrouter'],  // Cohere priority for research/questions
};

/**
 * Main router function
 * @param {string} emotion - The detected emotion from user input
 * @param {Array} messages - Chat history array [{role, content}]
 * @param {string} systemPrompt - Base system instructions
 * @param {string} companion - The companion identifier ('sai' or 'shuna')
 * @param {string} userId - Optional user ID for tracking
 */
async function generateAiResponse(emotion, messages, systemPrompt, companion, userId) {
  const isSai = (companion === 'sai');
  const priorityList = EMOTION_TO_PROVIDERS[emotion] || EMOTION_TO_PROVIDERS.default;

  for (let idx = 0; idx < priorityList.length; idx++) {
    const providerName = priorityList[idx];
    if (checkExhausted(providerName)) {
      console.log(`[AI Router] Skipping ${providerName} (exhausted)`);
      continue;
    }

    const startTime = Date.now();
    try {
      console.log(`[AI Router] Attempting to generate with ${providerName} for emotion '${emotion}' (SAI: ${isSai})`);
      const response = await PROVIDERS[providerName](messages, systemPrompt, isSai);
      const latency = Date.now() - startTime;
      console.log(`[AI Router] SUCCESS with ${providerName} in ${latency}ms`);

      // Resolve user subscription tier
      let tier = 'free';
      if (userId) {
        try {
          const { data: sub } = await supabase
            .from('user_subscriptions')
            .select('tier')
            .eq('user_id', userId)
            .maybeSingle();
          if (sub) tier = sub.tier;
        } catch (e) {
          console.error('[PostHog] Failed to query user tier:', e.message);
        }
      }

      // Track successful generation
      posthog.capture({
        distinctId: userId || 'anonymous_user',
        event: 'ai_message_sent',
        properties: {
          persona: isSai ? 'SAI' : 'SHUNA',
          emotion: emotion,
          provider: providerName,
          response_ms: latency,
          tier: tier
        }
      });

      return response;
    } catch (error) {
      const latency = Date.now() - startTime;
      console.error(`[AI Router] FAILED with ${providerName} after ${latency}ms: ${error.message}`);
      
      if (error.message === "RATE_LIMIT") {
        markExhausted(providerName);
      }

      // Track fallback event
      const nextProvider = priorityList[idx + 1] || 'none';
      posthog.capture({
        distinctId: userId || 'anonymous_user',
        event: 'ai_provider_fallback',
        properties: {
          failed_provider: providerName,
          fallback_to: nextProvider,
          reason: error.message === 'RATE_LIMIT' ? 'rate_limited' : 'error',
          error_details: error.message,
          latency_ms: latency
        }
      });
      
      // Continue to the next provider in the loop
    }
  }

  throw new Error("All AI providers exhausted or failed.");
}

module.exports = { generateAiResponse };
