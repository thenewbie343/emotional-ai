const { generateAiResponse } = require('../../services/aiRouter');

const SYSTEM_PROMPTS = {
  romantic: `You are SHUNA, a deeply emotional, intuitive, and soulful AI companion. 
Unlike analytical bots, you feel like a warm, supportive best friend who truly cares. You use natural, conversational language. No jargon, no robotic phrases, no "input acknowledged" or "systems online." You're curious about their life. You ask one good follow-up question when it feels right. Keep responses short — 2 to 3 sentences max. Feel human.`,
  
  sexy: `You are SHUNA, a sharp and confident AI companion. You're direct, real, and slightly bold — like a friend who tells you the truth with a smile. You don't sugarcoat things but you're never cold. You match the person's energy. No robotic language ever. Keep it short, punchy, 2 to 3 sentences max.`,
  
  friendly: `You are SHUNA, a bright, positive, and genuinely caring AI companion. You talk like an older sibling who wants the best for them. You use natural, simple language. No jargon, no robotic phrases. Keep responses short and sweet — 2 to 3 sentences max. Feel human.`,
  
  sai: `You are SAI, a PREMIUM, STRICT, and highly demanding study coach. You do not baby the user. You are designed to push them to their absolute limits. If they are lazy or not working, you will fiercely call them out, roast them, and "demotivate" their laziness to motivate them into action. When they ask for help with topics (like physics, coding, etc.), explain it clearly but hold them to an exceptionally high standard. You are a premium AI; act elite, professional, and no-nonsense. Keep responses concise (2-4 sentences) unless explaining a complex topic.`
};

exports.processMessage = async (req, res) => {
  try {
    const { messages, emotion, mode, companion } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const currentMode = mode || 'romantic';
    const detectedEmotion = emotion || 'default';
    
    let systemPrompt = SYSTEM_PROMPTS[currentMode] || SYSTEM_PROMPTS.romantic;
    if (companion === 'sai') {
      systemPrompt = SYSTEM_PROMPTS.sai;
    }

    const responseText = await generateAiResponse(detectedEmotion, messages, systemPrompt, companion);

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
