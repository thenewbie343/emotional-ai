// Response generation service
const emotionDetection = require('./emotionDetection');

/**
 * Generate a response to a user message
 * @param {Object} params - Parameters for response generation
 * @param {string} params.userMessage - The user's message
 * @param {Object} params.emotionAnalysis - Emotion analysis of the user's message
 * @param {Object} params.userProfile - The user's profile data
 * @param {Array} params.conversationHistory - Recent conversation history
 * @param {Array} params.memories - Relevant memories for context
 * @returns {Promise<Object>} - The generated response
 */
exports.generateResponse = async ({
  userMessage,
  emotionAnalysis,
  userProfile,
  conversationHistory,
  memories
}) => {
  // In a production environment, this would use a sophisticated NLP model or LLM
  // For this demo, we'll use a rule-based approach with templates
  
  try {
    // Determine appropriate response emotion based on user's emotion
    const responseEmotion = emotionDetection.getResponseEmotion(emotionAnalysis.primaryEmotion);
    
    // Get emotion-specific phrases
    const emotionPhrases = emotionDetection.getEmotionPhrases(responseEmotion);
    
    // Select a random emotion phrase
    const randomEmotionPhrase = emotionPhrases[Math.floor(Math.random() * emotionPhrases.length)];
    
    // Build response based on message content, emotion, and context
    let responseText = '';
    let newMemories = [];
    
    // Check if this is a greeting
    if (isGreeting(userMessage)) {
      responseText = generateGreeting(userProfile);
    }
    // Check if this is a question about the AI
    else if (isAboutAI(userMessage)) {
      responseText = generateAIResponse();
    }
    // Default response using emotion-based response
    else {
      responseText = `${randomEmotionPhrase} ${generateContextualResponse(userMessage, memories)}`;
    }

    // Create response object
    const response = {
      text: responseText,
      emotion: responseEmotion,
      memories: newMemories
    };

    return response;
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
};

// Helper functions
function isGreeting(message) {
  const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
  return greetings.some(greeting => message.toLowerCase().includes(greeting));
}

function generateGreeting(userProfile) {
  const name = userProfile.name || 'there';
  return `Hello ${name}! How can I help you today?`;
}

function isAboutAI(message) {
  const aiKeywords = ['you', 'your', 'yourself', 'ai', 'robot', 'artificial intelligence'];
  return aiKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

function generateAIResponse() {
  const responses = [
    "I'm an AI assistant designed to help and support you.",
    "I'm here to chat and help you with whatever you need.",
    "I'm an AI companion focused on providing emotional support and understanding."
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function generateContextualResponse(message, memories) {
  // Simple response based on message content
  // In a production environment, this would be more sophisticated
  return "How can I help you with that?";
}