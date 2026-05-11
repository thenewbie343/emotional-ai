// Conversation controller for handling conversation-related operations
const { getDatabase } = require('../../database/setup');
const aiController = require('./aiController');

/**
 * Get all conversations for a user
 */
exports.getConversations = (req, res) => {
  try {
    // In a real application, you would get the user ID from the JWT token
    const userId = req.query.userId; // For demonstration purposes
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const db = getDatabase();
    
    db.all(
      `SELECT id, started_at, last_message_at FROM conversations 
       WHERE user_id = ? 
       ORDER BY last_message_at DESC`,
      [userId],
      (err, conversations) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        
        res.json(conversations);
      }
    );
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a specific conversation
 */
exports.getConversation = (req, res) => {
  try {
    const conversationId = req.params.id;
    // In a real application, you would get the user ID from the JWT token
    const userId = req.query.userId; // For demonstration purposes
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const db = getDatabase();
    
    db.get(
      `SELECT id, user_id, started_at, last_message_at FROM conversations 
       WHERE id = ? AND user_id = ?`,
      [conversationId, userId],
      (err, conversation) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        
        if (!conversation) {
          return res.status(404).json({ error: 'Conversation not found' });
        }
        
        res.json(conversation);
      }
    );
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new conversation
 */
exports.createConversation = (req, res) => {
  try {
    // In a real application, you would get the user ID from the JWT token
    const userId = req.body.userId; // For demonstration purposes
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const db = getDatabase();
    
    db.run(
      `INSERT INTO conversations (user_id, started_at, last_message_at) 
       VALUES (?, datetime("now"), datetime("now"))`,
      [userId],
      function(err) {
        if (err) {
          console.error('Error creating conversation:', err);
          return res.status(500).json({ error: 'Failed to create conversation' });
        }
        
        const conversationId = this.lastID;
        
        // Add initial greeting message from AI
        db.run(
          `INSERT INTO messages (conversation_id, sender, content, emotion, timestamp) 
           VALUES (?, 'ai', 'Hello! How can I help you today?', 'friendly', datetime("now"))`,
          [conversationId],
          (err) => {
            if (err) {
              console.error('Error creating initial message:', err);
            }
            
            res.status(201).json({
              message: 'Conversation created successfully',
              conversationId,
              initialMessage: 'Hello! How can I help you today?'
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get messages for a conversation
 */
exports.getMessages = (req, res) => {
  try {
    const conversationId = req.params.id;
    // In a real application, you would get the user ID from the JWT token
    const userId = req.query.userId; // For demonstration purposes
    const limit = parseInt(req.query.limit) || 50;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const db = getDatabase();
    
    // First verify that the conversation belongs to the user
    db.get(
      'SELECT id FROM conversations WHERE id = ? AND user_id = ?',
      [conversationId, userId],
      (err, conversation) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        
        if (!conversation) {
          return res.status(404).json({ error: 'Conversation not found' });
        }
        
        // Get messages for the conversation
        db.all(
          `SELECT id, sender, content, emotion, sentiment, timestamp 
           FROM messages 
           WHERE conversation_id = ? 
           ORDER BY timestamp DESC 
           LIMIT ?`,
          [conversationId, limit],
          (err, messages) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Internal server error' });
            }
            
            res.json(messages.reverse()); // Reverse to get chronological order
          }
        );
      }
    );
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Send a message in a conversation
 */
exports.sendMessage = (req, res) => {
  try {
    const conversationId = req.params.id;
    // In a real application, you would get the user ID from the JWT token
    const userId = req.body.userId; // For demonstration purposes
    const { content } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    const db = getDatabase();
    
    // First verify that the conversation belongs to the user
    db.get(
      'SELECT id FROM conversations WHERE id = ? AND user_id = ?',
      [conversationId, userId],
      (err, conversation) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        
        if (!conversation) {
          return res.status(404).json({ error: 'Conversation not found' });
        }
        
        // Update last message timestamp
        db.run(
          'UPDATE conversations SET last_message_at = datetime("now") WHERE id = ?',
          [conversationId]
        );
        
        // Insert user message
        db.run(
          `INSERT INTO messages (conversation_id, sender, content, timestamp) 
           VALUES (?, 'user', ?, datetime("now"))`,
          [conversationId, content],
          function(err) {
            if (err) {
              console.error('Error saving message:', err);
              return res.status(500).json({ error: 'Failed to save message' });
            }
            
            const messageId = this.lastID;
            
            // Process message with AI and get response
            aiController.processMessageInternal(userId, conversationId, content)
              .then(aiResponse => {
                res.status(201).json({
                  message: 'Message sent successfully',
                  messageId,
                  aiResponse
                });
              })
              .catch(error => {
                console.error('AI processing error:', error);
                res.status(201).json({
                  message: 'Message sent successfully, but AI response failed',
                  messageId,
                  error: 'Failed to generate AI response'
                });
              });
          }
        );
      }
    );
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};