// User controller for handling user-related operations
const { getDatabase } = require('../../database/setup');
const bcrypt = require('bcrypt');

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    const { username, password, name } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const db = getDatabase();
    
    // Check if username already exists
    db.get('SELECT id FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (user) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Insert new user
      db.run(
        'INSERT INTO users (username, password, name, created_at) VALUES (?, ?, ?, datetime("now"))',
        [username, hashedPassword, name],
        function(err) {
          if (err) {
            console.error('Error creating user:', err);
            return res.status(500).json({ error: 'Failed to create user' });
          }
          
          const userId = this.lastID;
          
          // Create initial user profile
          db.run(
            'INSERT INTO user_profiles (user_id, preferences, personality_traits, interests) VALUES (?, ?, ?, ?)',
            [userId, '{}', '{}', '{}'],
            (err) => {
              if (err) {
                console.error('Error creating user profile:', err);
              }
              
              res.status(201).json({
                message: 'User registered successfully',
                userId
              });
            }
          );
        }
      );
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Login a user
 */
exports.login = (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const db = getDatabase();
    
    db.get('SELECT id, password, name FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      
      // Compare password
      const passwordMatch = await bcrypt.compare(password, user.password);
      
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      
      // Update last login time
      db.run('UPDATE users SET last_login = datetime("now") WHERE id = ?', [user.id]);
      
      // In a real application, you would generate a JWT token here
      res.json({
        message: 'Login successful',
        userId: user.id,
        name: user.name
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get user profile
 */
exports.getProfile = (req, res) => {
  try {
    // In a real application, you would get the user ID from the JWT token
    const userId = req.query.userId; // For demonstration purposes
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const db = getDatabase();
    
    db.get(
      `SELECT u.id, u.username, u.name, u.created_at, up.preferences, up.personality_traits, up.interests 
       FROM users u 
       LEFT JOIN user_profiles up ON u.id = up.user_id 
       WHERE u.id = ?`,
      [userId],
      (err, profile) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        
        if (!profile) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        // Parse JSON strings
        try {
          profile.preferences = JSON.parse(profile.preferences || '{}');
          profile.personality_traits = JSON.parse(profile.personality_traits || '{}');
          profile.interests = JSON.parse(profile.interests || '{}');
        } catch (e) {
          console.error('Error parsing profile JSON:', e);
        }
        
        // Remove sensitive information
        delete profile.password;
        
        res.json(profile);
      }
    );
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update user profile
 */
exports.updateProfile = (req, res) => {
  try {
    // In a real application, you would get the user ID from the JWT token
    const userId = req.body.userId; // For demonstration purposes
    const { name, preferences, personality_traits, interests } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const db = getDatabase();
    
    // Update user name if provided
    if (name) {
      db.run('UPDATE users SET name = ? WHERE id = ?', [name, userId]);
    }
    
    // Update profile data if provided
    const updates = [];
    const params = [];
    
    if (preferences) {
      updates.push('preferences = ?');
      params.push(JSON.stringify(preferences));
    }
    
    if (personality_traits) {
      updates.push('personality_traits = ?');
      params.push(JSON.stringify(personality_traits));
    }
    
    if (interests) {
      updates.push('interests = ?');
      params.push(JSON.stringify(interests));
    }
    
    if (updates.length > 0) {
      params.push(userId);
      
      db.run(
        `UPDATE user_profiles SET ${updates.join(', ')} WHERE user_id = ?`,
        params,
        function(err) {
          if (err) {
            console.error('Error updating profile:', err);
            return res.status(500).json({ error: 'Failed to update profile' });
          }
          
          if (this.changes === 0) {
            // Profile doesn't exist, create it
            const profileData = {
              preferences: preferences ? JSON.stringify(preferences) : '{}',
              personality_traits: personality_traits ? JSON.stringify(personality_traits) : '{}',
              interests: interests ? JSON.stringify(interests) : '{}'
            };
            
            db.run(
              'INSERT INTO user_profiles (user_id, preferences, personality_traits, interests) VALUES (?, ?, ?, ?)',
              [userId, profileData.preferences, profileData.personality_traits, profileData.interests]
            );
          }
          
          res.json({ message: 'Profile updated successfully' });
        }
      );
    } else {
      res.json({ message: 'No profile updates provided' });
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};