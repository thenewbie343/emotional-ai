const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Estimate tokens (standard heuristic: ~4 characters per token)
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// Local cosine similarity on term-frequency vectors for memory matching
function getLocalCosineSimilarity(textA, textB) {
  const wordsA = textA.toLowerCase().match(/\w+/g) || [];
  const wordsB = textB.toLowerCase().match(/\w+/g) || [];
  
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const freqA = {};
  const freqB = {};
  const allWords = new Set([...wordsA, ...wordsB]);

  wordsA.forEach(w => freqA[w] = (freqA[w] || 0) + 1);
  wordsB.forEach(w => freqB[w] = (freqB[w] || 0) + 1);

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  allWords.forEach(w => {
    const valA = freqA[w] || 0;
    const valB = freqB[w] || 0;
    dotProduct += valA * valB;
    magA += valA * valA;
    magB += valB * valB;
  });

  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
}

// Smart extractive summarizer that prioritizes emotional and semantic rich sentences
function summarizeText(text, targetTokens) {
  if (!text) return '';
  const currentTokens = estimateTokens(text);
  if (currentTokens <= targetTokens) return text;

  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  // Scoring words based on emotional resonance
  const emotionalKeywords = [
    'sad', 'happy', 'love', 'angry', 'hate', 'feel', 'lonely', 'anxious', 
    'excited', 'scared', 'fear', 'depressed', 'hope', 'hurt', 'pain', 
    'joy', 'tired', 'dream', 'wish', 'want', 'need', 'broken', 'cry', 'smile'
  ];

  const scoredSentences = sentences.map((sentence, idx) => {
    let score = 0;
    const words = sentence.toLowerCase().split(/\W+/);
    
    // Higher score for emotional keywords
    words.forEach(w => {
      if (emotionalKeywords.includes(w)) score += 5;
    });

    // Slight bias toward earlier sentences (introductory context)
    score += Math.max(0, 10 - idx * 2);

    return { sentence, score };
  });

  // Sort by score and rebuild summary up to the target token budget
  scoredSentences.sort((a, b) => b.score - a.score);

  let summary = '';
  let tokenCount = 0;

  // Re-assemble in original chronological order
  const selectedSentences = [];
  for (const item of scoredSentences) {
    const itemTokens = estimateTokens(item.sentence);
    if (tokenCount + itemTokens <= targetTokens - 3) { // reserve space for ellipsis
      selectedSentences.push(item);
      tokenCount += itemTokens;
    }
    if (tokenCount >= targetTokens - 10) break;
  }

  // Sort back to original chronological order of appearance in text
  selectedSentences.sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence));
  
  summary = selectedSentences.map(s => s.sentence.trim()).join(' ');
  
  if (summary.length < text.length) {
    summary += '...';
  }
  
  return summary;
}

/**
 * Assembles a highly compressed, emotionally rich context from Supabase data
 * under the 4,000 token limit.
 * 
 * @param {string} userId - The Supabase user UUID
 * @param {string} userMessage - The current user message to match memories against
 */
async function assembleContext(userId, userMessage) {
  if (!userId) return '';

  try {
    // 1. Fetch raw data from Supabase in parallel
    const [diaryRes, wellnessRes, memoriesRes] = await Promise.all([
      supabase.from("sai_diary").select("diary_text, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      supabase.from("sai_wellness").select("wellness_data, date_key").eq("user_id", userId).order("date_key", { ascending: false }).limit(3),
      supabase.from("sai_memories").select("fact, category").eq("user_id", userId)
    ]);

    const diaryEntries = diaryRes.data || [];
    const wellnessLogs = wellnessRes.data || [];
    const allMemories = memoriesRes.data || [];

    // 2. Process Diary Entries (Summarize last 5 entries to ~100 tokens each)
    const diarySummaries = diaryEntries.map((entry, idx) => {
      const date = entry.created_at ? new Date(entry.created_at).toLocaleDateString() : 'Unknown Date';
      const cleanText = entry.diary_text || '';
      const summary = summarizeText(cleanText, 100);
      return `Diary [${date}]: ${summary}`;
    });

    // 3. Process Wellness Logs (Summarize last 3 days to ~50 tokens per day)
    const wellnessSummaries = wellnessLogs.map(log => {
      const date = log.date_key || 'Unknown';
      let dataStr = '';
      
      if (typeof log.wellness_data === 'object' && log.wellness_data !== null) {
        // Formulate a compact string of key-value pairs
        dataStr = Object.entries(log.wellness_data)
          .map(([key, val]) => `${key}: ${val}`)
          .join(', ');
      } else {
        dataStr = String(log.wellness_data || '');
      }

      const summary = summarizeText(dataStr, 50);
      return `Wellness [${date}]: ${summary}`;
    });

    // 4. Retrieve top 5 memories using Cosine Similarity against user message
    let topMemories = [];
    if (allMemories.length > 0 && userMessage) {
      const scoredMemories = allMemories.map(m => {
        const score = getLocalCosineSimilarity(userMessage, m.fact || '');
        return { fact: m.fact, category: m.category, score };
      });

      // Sort by similarity descending
      scoredMemories.sort((a, b) => b.score - a.score);
      topMemories = scoredMemories.slice(0, 5);
    } else {
      // Fallback if no user message is present
      topMemories = allMemories.slice(0, 5);
    }

    // 5. Assemble final prompt string
    const memoriesSection = topMemories.length > 0 
      ? topMemories.map(m => `- [${m.category || 'general'}] ${m.fact}`).join('\n')
      : '- No relevant memories found.';

    const diarySection = diarySummaries.length > 0
      ? diarySummaries.join('\n')
      : '- No recent diary entries.';

    const wellnessSection = wellnessSummaries.length > 0
      ? wellnessSummaries.join('\n')
      : '- No recent wellness logs.';

    const finalContext = `
=== USER HISTORICAL CONTEXT ===

[RELEVANT PERSONAL MEMORIES]
${memoriesSection}

[RECENT DIARY SUMMARIES (MAX 5)]
${diarySection}

[RECENT WELLNESS RECORDS (MAX 3 DAYS)]
${wellnessSection}
===============================
`;

    // Final safety truncation to ensure we stay well under 4,000 tokens (approx 16,000 chars)
    if (estimateTokens(finalContext) > 3000) {
      console.warn('[Context Assembler] Context size exceeded safety limit, truncating.');
      return finalContext.substring(0, 12000) + '\n... (truncated for length)';
    }

    return finalContext;
  } catch (err) {
    console.error('[Context Assembler Error]:', err.message);
    return '';
  }
}

module.exports = {
  assembleContext
};
