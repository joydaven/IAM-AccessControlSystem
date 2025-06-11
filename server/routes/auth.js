const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database/setup');
const { generateToken, authenticateToken, getUserPermissions } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

// Register new user
router.post('/register', validate('register'), async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], async (err, existingUser) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingUser) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insert new user
      db.run(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [username, email, passwordHash],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create user' });
          }

          const newUser = {
            id: this.lastID,
            username,
            email
          };

          const token = generateToken(newUser);

          res.status(201).json({
            message: 'User created successfully',
            user: newUser,
            token
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login user
router.post('/login', validate('login'), async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate token
      const userInfo = {
        id: user.id,
        username: user.username,
        email: user.email
      };

      const token = generateToken(userInfo);

      res.json({
        message: 'Login successful',
        user: userInfo,
        token
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user's permissions
router.get('/me/permissions', authenticateToken, (req, res) => {
  getUserPermissions(req.user.id, (err, permissions) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch permissions' });
    }

    res.json({
      user: req.user,
      permissions
    });
  });
});

// Simulate action - test if user can perform action
router.post('/simulate-action', authenticateToken, validate('simulateAction'), (req, res) => {
  const { userId, module, action } = req.body;

  // Query to check if user has permission
  const query = `
    SELECT COUNT(*) as count
    FROM user_groups ug
    JOIN group_roles gr ON ug.group_id = gr.group_id
    JOIN role_permissions rp ON gr.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    JOIN modules m ON p.module_id = m.id
    WHERE ug.user_id = ? AND m.name = ? AND p.action = ?
  `;

  db.get(query, [userId, module, action], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const hasPermission = row.count > 0;

    res.json({
      userId,
      module,
      action,
      hasPermission,
      message: hasPermission 
        ? `User can ${action} on ${module}` 
        : `User cannot ${action} on ${module}`
    });
  });
});

module.exports = router; 