const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database/setup');
const { authenticateToken, checkPermission } = require('../middleware/auth');
const { validate, validateId } = require('../middleware/validation');

const router = express.Router();

// Get all users
router.get('/', authenticateToken, checkPermission('Users', 'read'), (req, res) => {
  const query = `
    SELECT u.id, u.username, u.email, u.created_at,
           GROUP_CONCAT(g.name) as groups
    FROM users u
    LEFT JOIN user_groups ug ON u.id = ug.user_id
    LEFT JOIN groups g ON ug.group_id = g.id
    GROUP BY u.id, u.username, u.email, u.created_at
    ORDER BY u.username
  `;

  db.all(query, (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    // Parse groups for each user
    const formattedUsers = users.map(user => ({
      ...user,
      groups: user.groups ? user.groups.split(',') : []
    }));

    res.json(formattedUsers);
  });
});

// Get user by ID
router.get('/:id', authenticateToken, checkPermission('Users', 'read'), validateId, (req, res) => {
  const query = `
    SELECT u.id, u.username, u.email, u.created_at,
           JSON_GROUP_ARRAY(
             JSON_OBJECT('id', g.id, 'name', g.name, 'description', g.description)
           ) as groups
    FROM users u
    LEFT JOIN user_groups ug ON u.id = ug.user_id
    LEFT JOIN groups g ON ug.group_id = g.id
    WHERE u.id = ?
    GROUP BY u.id
  `;

  db.get(query, [req.params.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch user' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Parse groups JSON
    try {
      user.groups = JSON.parse(user.groups).filter(group => group.id !== null);
    } catch (e) {
      user.groups = [];
    }

    res.json(user);
  });
});

// Create new user
router.post('/', authenticateToken, checkPermission('Users', 'create'), validate('user'), async (req, res) => {
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

          res.status(201).json({
            id: this.lastID,
            username,
            email,
            message: 'User created successfully'
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user
router.put('/:id', authenticateToken, checkPermission('Users', 'update'), validateId, validate('userUpdate'), async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, email, password } = req.body;

    // Check if user exists
    db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Build update query dynamically
      const updates = [];
      const values = [];

      if (username) {
        // Check if username is taken by another user
        const existingUser = await new Promise((resolve, reject) => {
          db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });

        if (existingUser) {
          return res.status(400).json({ error: 'Username already exists' });
        }

        updates.push('username = ?');
        values.push(username);
      }

      if (email) {
        // Check if email is taken by another user
        const existingUser = await new Promise((resolve, reject) => {
          db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });

        if (existingUser) {
          return res.status(400).json({ error: 'Email already exists' });
        }

        updates.push('email = ?');
        values.push(email);
      }

      if (password) {
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        updates.push('password_hash = ?');
        values.push(passwordHash);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(userId);

      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

      db.run(query, values, function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update user' });
        }

        res.json({ message: 'User updated successfully' });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user
router.delete('/:id', authenticateToken, checkPermission('Users', 'delete'), validateId, (req, res) => {
  const userId = req.params.id;

  // Check if user exists
  db.get('SELECT id FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't allow deletion of current user
    if (userId == req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Delete user (CASCADE will handle related records)
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete user' });
      }

      res.json({ message: 'User deleted successfully' });
    });
  });
});

module.exports = router; 