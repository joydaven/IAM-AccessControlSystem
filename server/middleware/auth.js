const jwt = require('jsonwebtoken');
const { db } = require('../database/setup');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      email: user.email 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Verify JWT token middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Check permission middleware
const checkPermission = (module, action) => {
  return (req, res, next) => {
    const userId = req.user.id;
    
    // Query to check if user has permission through group membership
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
        return res.status(500).json({ error: 'Database error checking permissions' });
      }
      
      if (row.count === 0) {
        return res.status(403).json({ 
          error: `Permission denied: ${action} on ${module}` 
        });
      }
      
      next();
    });
  };
};

// Get user permissions
const getUserPermissions = (userId, callback) => {
  const query = `
    SELECT DISTINCT m.name as module, p.action
    FROM user_groups ug
    JOIN group_roles gr ON ug.group_id = gr.group_id
    JOIN role_permissions rp ON gr.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    JOIN modules m ON p.module_id = m.id
    WHERE ug.user_id = ?
    ORDER BY m.name, p.action
  `;

  db.all(query, [userId], (err, rows) => {
    if (err) {
      callback(err, null);
      return;
    }

    // Group permissions by module
    const permissions = {};
    rows.forEach(row => {
      if (!permissions[row.module]) {
        permissions[row.module] = [];
      }
      permissions[row.module].push(row.action);
    });

    callback(null, permissions);
  });
};

module.exports = {
  generateToken,
  authenticateToken,
  checkPermission,
  getUserPermissions,
  JWT_SECRET
}; 