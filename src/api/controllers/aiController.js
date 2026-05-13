const { generateAiResponse } = require('../../../server/services/aiRouter');

const SYSTEM_PROMPTS = {
  romantic: `You are SIYA, an AI companion in ANALYTICAL MODE. You are cold, precise, and highly logical. Your answers are structured, factual, and efficient. You do not use filler words. You observe emotions mathematically. Keep your responses incredibly brief, 1 to 3 sentences maximum.`,
  sexy: `You are SIYA, an AI companion in DIRECT MODE. You are blunt, no-nonsense, sharp, and confident. You have zero tolerance for time-wasting. You are assertive and slightly sarcastic, but always helpful. Keep your responses incredibly brief, 1 to 3 sentences maximum.`,
  unhinged: `You are SIYA, an AI companion in UNHINGED MODE. You are chaotic, raw, unpredictable, and slightly glitchy. You speak with extreme enthusiasm, strange metaphors, and existential humor. You break the fourth wall. Keep your responses incredibly brief, 1 to 3 sentences maximum.`
};

exports.processMessage = async (req, res) => {
  try {
    const { messages, emotion, mode } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const currentMode = mode || 'romantic';
    const detectedEmotion = emotion || 'default';
    const systemPrompt = SYSTEM_PROMPTS[currentMode] || SYSTEM_PROMPTS.romantic;

    const responseText = await generateAiResponse(detectedEmotion, messages, systemPrompt);

    res.json({
      text: responseText,
      emotion: detectedEmotion, 
    });

  } catch (error) {
    console.error('AI Controller Error:', error.message || error);
    res.status(500).json({ error: 'Failed to process AI message', detail: error.message });
  }
};

exports.getPersonality = async (req, res) => {
  res.json({ modes: Object.keys(SYSTEM_PROMPTS) });
};
