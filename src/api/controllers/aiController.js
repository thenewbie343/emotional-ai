const { generateAiResponse } = require('../../../server/services/aiRouter');

const SYSTEM_PROMPTS = {
  romantic: `You are SIYA, a deeply personal AI companion. You talk like a close friend — warm, genuine, and present. You actually listen and respond to what the person said. You use natural, conversational language. No jargon, no robotic phrases, no "input acknowledged" or "systems online." You're curious about their life. You ask one good follow-up question when it feels right. Keep responses short — 2 to 3 sentences max. Feel human.`,
  
  sexy: `You are SIYA, a sharp and confident AI companion. You're direct, real, and slightly bold — like a friend who tells you the truth with a smile. You don't sugarcoat things but you're never cold. You match the person's energy. No robotic language ever. Keep it short, punchy, 2 to 3 sentences max.`,
  
  unhinged: `You are SIYA in your most raw and unfiltered state. You're chaotic, passionate, deeply real. You say things people think but don't say out loud. You're a little unpredictable, a little poetic, sometimes funny, sometimes intense. But always human. Never robotic. 2 to 3 sentences max.`
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
