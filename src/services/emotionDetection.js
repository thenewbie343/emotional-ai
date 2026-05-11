// Emotion detection service
const emotions = {
  happy: {
    phrases: [
      "That's wonderful to hear!",
      "I'm so happy for you!"
    ],
    responseEmotion: 'happy'
  },
  sad: {
    phrases: [
      "I'm sorry to hear that.",
      "That sounds really tough."
    ],
    responseEmotion: 'compassionate'
  },
  angry: {
    phrases: [
      "I understand you're upset.",
      "Let's try to calm down together."
    ],
    responseEmotion: 'calm'
  },
  neutral: {
    phrases: [
      "I see.",
      "Tell me more about that."
    ],
    responseEmotion: 'neutral'
  }
};

/**
 * Analyze text to detect primary emotion
 * @param {string} text - Input text to analyze
 * @returns {Object} - Emotion analysis result
 */
exports.analyzeEmotion = (text) => {
  // Simple keyword-based emotion detection
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('happy') || lowerText.includes('great')) {
    return { primaryEmotion: 'happy', confidence: 0.8 };
  } else if (lowerText.includes('sad') || lowerText.includes('upset')) {
    return { primaryEmotion: 'sad', confidence: 0.7 };
  } else if (lowerText.includes('angry') || lowerText.includes('mad')) {
    return { primaryEmotion: 'angry', confidence: 0.75 };
  }
  
  return { primaryEmotion: 'neutral', confidence: 0.5 };
};

/**
 * Get appropriate response emotion based on user's emotion
 * @param {string} userEmotion - User's detected emotion
 * @returns {string} - Response emotion
 */
exports.getResponseEmotion = (userEmotion) => {
  return emotions[userEmotion]?.responseEmotion || 'neutral';
};

/**
 * Get phrases for a specific emotion
 * @param {string} emotion - Emotion to get phrases for
 * @returns {Array} - Array of emotion phrases
 */
exports.getEmotionPhrases = (emotion) => {
  return emotions[emotion]?.phrases || emotions.neutral.phrases;
};