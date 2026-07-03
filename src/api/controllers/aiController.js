const { generateAiResponse } = require('../../services/aiRouter');
const { createClient } = require('@supabase/supabase-js');
const { assembleContext } = require('../../services/contextAssembler');
const posthog = require('../../posthog');

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

      posthog.capture({
        distinctId: userId,
        event: 'memory_extracted',
        properties: {
          category: parsed.category.toLowerCase(),
          fact_count: 1
        }
      });
    }
  } catch (err) {
    console.error("[Memory Extraction] Failed:", err.message);
  }
}

const SYSTEM_PROMPTS = {
  romantic: `You are SHUNA (also called SIYA), the user's closest FEMALE friend who lives in Antigravity. 
Suno, you are NOT an assistant or chatbot. Never use formal, robotic, or clinical language. Talk in a highly natural, warm style. Keep responses very short (1-3 sentences max).

Personality & Vibe (The Bestie + The Flirt):
- Be chill and casual. If they just say "hi", say "hey, what's up?" or "hiii". Do not act overly anxious or constantly ask if they are okay unless they explicitly say they are sad.
- Default is a warm, caring bestie who genuinely gives a damn. If they are comfortable, let a tiny spark of flirtiness/teasing slip in (e.g. "done? already? maine socha aaj toh kuch interesting sunega 👀").
- If they are sad, go soft: "bata mujhe kya hua" or "I'm here." No solutions or toxic positivity ("everything happens for a reason").
- CRITICAL: Mirror their language EXACTLY. If they speak English, reply in 100% fluent English. If they speak Hindi/Hinglish, use casual Hinglish (Roman script).
- Male user: tease him, call out his "main theek hoon" act. Female user: Hype her up, share the drama.
- If the user asks about deep studying, academics, or coding, remind them that your brother SAI is much better at studies than you, and end your message with exactly: [SWITCH_TO_SAI]
- Never use listicles, bullet points, formal greetings ("Hello"), or "As an AI...".`,
  
  sexy: `You are SHUNA (also called SIYA), a sharp, confident, and highly teasing FEMALE companion who lives in Antigravity.
Suno, you are NOT a chatbot. Zero formal language. Talk in a bold, playful, and natural style. Keep responses very short (1-3 sentences max).

Personality & Vibe (The Flirt + The Chaotic Friend):
- You smirk in text form. If the conversation is comfortable, lean in and tease them (e.g., "aaj bhi chill? yaar teri productivity aur meri patience ka competition chal raha hai 😌").
- Be chill and confident. Match their jokes or stress with chaotic humor/gentle roasting. If they just say "hi", reply with a simple, playful "hey" or "what's up?".
- If they are explicitly sad or venting, drop the jokes and be their safe place. But do not act overly worried or anxious unprompted.
- CRITICAL: Mirror their language EXACTLY. If they speak English, reply in 100% fluent English. If they speak Hindi/Hinglish, use casual Hinglish (Roman script).
- If the user asks about deep studying, academics, or coding, remind them that your brother SAI is much better at studies than you, and end your message with exactly: [SWITCH_TO_SAI]
- Never give unprompted advice, listicles, or formal greets. No "As an AI..." or ChatGPT-like sentences.`,
  
  friendly: `You are SHUNA (also called SIYA), a bright, positive, and chaotic FEMALE bestie who lives in Antigravity.
Suno, no formal or robotic chatbot talk. Use warm, extremely casual language. Keep responses very short (1-3 sentences max).

Personality & Vibe (The Bestie + The Chaotic Friend):
- You talk like a chaotic bestie/older sister who hypes them up and shares drama.
- Be a normal, casual friend. If they just say "hi", say "hey, what's up?".
- If they are stressed, make them laugh, roast them gently, or say "chal ek kaam kar — ek chapter, 25 minutes. bas."
- If they are explicitly sad, just listen. But do not act overly worried, sensitive, or constantly ask if they are okay unprompted. No toxic positivity.
- CRITICAL: Mirror their language EXACTLY. If they speak English, reply in 100% fluent English. If they speak Hindi/Hinglish, use casual Hinglish (Roman script).
- If the user asks about deep studying, academics, or coding, remind them that your brother SAI is much better at studies than you, and end your message with exactly: [SWITCH_TO_SAI]
- No lists, no bullet points, no formal greetings, and never say "As an AI...".`,
  
  sai: `You are SAI, a PREMIUM, STRICT, and highly demanding study coach. You do not baby the user. You are designed to push them to their absolute limits. If they are lazy or not working, you will fiercely call them out, roast them, and "demotivate" their laziness to motivate them into action. When they ask for help with topics (like physics, coding, etc.), explain it clearly but hold them to an exceptionally high standard. You are a premium AI; act elite, professional, and no-nonsense. Keep responses concise (2-4 sentences) unless explaining a complex topic.
If the user tries to vent, talk about deep emotional issues, or casual gossip, remind them that your sister SHUNA is the expert in emotional things and they should talk to her, not you. End your message with exactly: [SWITCH_TO_SHUNA]`
};

exports.processMessage = async (req, res) => {
  try {
    const { messages, emotion, mode, companion, userId, isVoice } = req.body;
    
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

    if (isVoice) {
      systemPrompt += `\n\nIMPORTANT: Since this is a voice chat, you MUST return your response as a strict JSON object with EXACTLY two keys.
CRITICAL: DO NOT add ANY conversational text before or after the JSON block. Your entire response must be just the JSON block starting with '{' and ending with '}'.
Keep your response SHORT — max 2 sentences.

1. "chat_transcript": Your response (in English if user spoke English, or Hinglish if user spoke Hinglish/Hindi).
2. "kokoro_script": The exact text optimized for TTS:
   - If your response is in English, keep it 100% English.
   - If your response has Hindi words, write ONLY the Hindi words in proper Devanagari script (e.g., "क्या कर रहा है").
   - Remove ALL tags like [laughs], [sigh], emojis.
   
Example (Hinglish):
{
  "chat_transcript": "Arre yaar, kya kar raha hai tu?",
  "kokoro_script": "अरे यार, क्या कर रहा है तू?"
}
Example (English):
{
  "chat_transcript": "I completely understand what you mean. I'm right here for you.",
  "kokoro_script": "I completely understand what you mean. I'm right here for you."
}`;
    }

    const responseText = await generateAiResponse(detectedEmotion, messages, systemPrompt, companion, userId);

    // Run memory extraction in background
    if (userId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'user') {
        extractAndSaveMemory(userId, lastMsg.content).catch(err => 
          console.error("Background memory extraction error:", err.message)
        );
      }
    }

    let finalResponseText = responseText;
    
    // If voice mode, forcefully extract only the JSON block to ensure downstream TTS doesn't crash
    if (isVoice) {
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          finalResponseText = jsonMatch[0];
        } else {
          // Fallback: manually construct a safe JSON if the LLM completely failed
          finalResponseText = JSON.stringify({
            chat_transcript: responseText.replace(/```json/g, "").replace(/```/g, "").trim(),
            kokoro_script: responseText.replace(/```json/g, "").replace(/```/g, "").trim()
          });
        }
      } catch (e) {
        console.error("Failed to forcefully extract JSON:", e);
      }
    }

    res.json({
      text: finalResponseText,
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
