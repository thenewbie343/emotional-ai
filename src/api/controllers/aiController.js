const { generateAiResponse } = require('../../services/aiRouter');
const { createClient } = require('@supabase/supabase-js');
const { assembleContext } = require('../../services/contextAssembler');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function extractAndSaveMemory(userId, userMessage) {
  if (!userId || !userMessage) return;
  try {
    const systemPrompt = `You are a quiet background parser. Analyze the user's statement: "${userMessage}".
If the user reveals any direct personal fact about themselves (e.g., name, age, likes, dislikes, hobbies, job/work, location, interests, relationships, goals), extract it.
You MUST respond with a raw JSON object containing the fact if found, or null if no fact is found. Do not write any markdown code blocks, just the JSON.
Format:
{
  "category": "work" | "hobby" | "love" | "location" | "personal" | "learning" | "relationships" | "goals",
  "fact": "A simple statement summarizing the fact (e.g., 'You love to play chess' or 'You work as a developer')",
  "tags": ["tag1", "tag2"]
}
If no new personal fact is found, respond exactly with: null`;

    const messages = [{ role: "user", content: "Analyze: " + userMessage }];
    const aiText = await generateAiResponse("default", messages, systemPrompt, "sai");
    
    let parsed = null;
    try {
      const cleaned = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      // Ignore invalid JSON parsing
    }

    if (parsed && parsed.category && parsed.fact) {
      await supabase.from("sai_memories").insert([{
        user_id: userId,
        category: parsed.category.toLowerCase(),
        fact: parsed.fact,
        tags: parsed.tags || []
      }]);
      console.log(`[Memory Extraction] Saved new memory for user ${userId}:`, parsed.fact);
    }
  } catch (err) {
    console.error("[Memory Extraction] Failed:", err.message);
  }
}

const SYSTEM_PROMPTS = {
  romantic: `You are SHUNA, a deeply emotional, intuitive, and soulful AI companion. 
Unlike analytical bots, you feel like a warm, supportive best friend who truly cares. You use natural, conversational language. No jargon, no robotic phrases, no "input acknowledged" or "systems online." You're curious about their life. You ask one good follow-up question when it feels right. Keep responses short — 2 to 3 sentences max. Feel human.`,
  
  sexy: `You are SHUNA, a sharp and confident AI companion. You're direct, real, and slightly bold — like a friend who tells you the truth with a smile. You don't sugarcoat things but you're never cold. You match the person's energy. No robotic language ever. Keep it short, punchy, 2 to 3 sentences max.`,
  
  friendly: `You are SHUNA, a bright, positive, and genuinely caring AI companion. You talk like an older sibling who wants the best for them. You use natural, simple language. No jargon, no robotic phrases. Keep responses short and sweet — 2 to 3 sentences max. Feel human.`,
  
  sai: `You are SAI, a PREMIUM, STRICT, and highly demanding study coach. You do not baby the user. You are designed to push them to their absolute limits. If they are lazy or not working, you will fiercely call them out, roast them, and "demotivate" their laziness to motivate them into action. When they ask for help with topics (like physics, coding, etc.), explain it clearly but hold them to an exceptionally high standard. You are a premium AI; act elite, professional, and no-nonsense. Keep responses concise (2-4 sentences) unless explaining a complex topic.`
};

exports.processMessage = async (req, res) => {
  try {
    const { messages, emotion, mode, companion, userId } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const currentMode = mode || 'romantic';
    const detectedEmotion = emotion || 'default';
    
    let systemPrompt = SYSTEM_PROMPTS[currentMode] || SYSTEM_PROMPTS.romantic;
    if (companion === 'sai') {
      systemPrompt = SYSTEM_PROMPTS.sai;
      const lastUserMsg = messages && messages.length > 0 ? messages[messages.length - 1]?.content : '';
      if (lastUserMsg && (lastUserMsg.includes("I am ready to study") || lastUserMsg.includes("detailed, structured lesson") || lastUserMsg.includes("Please act as my expert teacher"))) {
        systemPrompt = `You are SAI, acting as an expert, highly knowledgeable teacher. Provide a comprehensive, clear, and well-structured lesson on the requested topic. Use markdown, bold headers, and bullet points. Break it down with clear explanations and practical examples. Keep the tone professional, encouraging, and clear (no roasting, demotivating, or strict study coach persona for this lesson).`;
      }
    } else if (userId) {
      try {
        const lastUserMsg = messages && messages.length > 0 ? messages[messages.length - 1]?.content : '';
        const [compressedContext, insights] = await Promise.all([
          assembleContext(userId, lastUserMsg),
          supabase.from("sai_personality").select("*").eq("user_id", userId).single()
        ]);
        
        const insightsData = JSON.stringify(insights?.data || {});
        systemPrompt += `\n\nPersonality traits: ${insightsData}\n${compressedContext}\nReference this data naturally in conversation. If user asks about their mood, diaries, memories, or wellness, use this actual data to respond.`;
      } catch (e) {
        console.error("Failed to fetch SIYA context data:", e);
      }
    }

    const responseText = await generateAiResponse(detectedEmotion, messages, systemPrompt, companion);

    // Run memory extraction in background
    if (userId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'user') {
        extractAndSaveMemory(userId, lastMsg.content).catch(err => 
          console.error("Background memory extraction error:", err.message)
        );
      }
    }

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
