const express = require('express');
const { db } = require('../database/setup');
const { authenticateToken, checkPermission } = require('../middleware/auth');
const { validate, validateId } = require('../middleware/validation');

const router = express.Router();

// Get all permissions
router.get('/', authenticateToken, checkPermission('Permissions', 'read'), (req, res) => {
  const query = `
    SELECT p.id, p.action, p.created_at, m.name as module_name, m.id as module_id,
           COUNT(rp.role_id) as role_count
    FROM permissions p
    JOIN modules m ON p.module_id = m.id
    LEFT JOIN role_permissions rp ON p.id = rp.permission_id
    GROUP BY p.id, p.action, p.created_at, m.name, m.id
    ORDER BY m.name, p.action
  `;

  db.all(query, (err, permissions) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch permissions' });
    }

    res.json(permissions);
  });
});

// Get permission by ID with roles
router.get('/:id', authenticateToken, checkPermission('Permissions', 'read'), validateId, (req, res) => {
  const permissionId = req.params.id;

  // Get permission details
  const query = `
    SELECT p.id, p.action, p.created_at, m.name as module_name, m.id as module_id
    FROM permissions p
    JOIN modules m ON p.module_id = m.id
    WHERE p.id = ?
  `;

  db.get(query, [permissionId], (err, permission) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch permission' });
    }

    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    // Get roles that have this permission
    const rolesQuery = `
      SELECT r.id, r.name, r.description
      FROM roles r
      JOIN role_permissions rp ON r.id = rp.role_id
      WHERE rp.permission_id = ?
      ORDER BY r.name
    `;

    db.all(rolesQuery, [permissionId], (err, roles) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch permission roles' });
      }

      res.json({
        ...permission,
        roles
      });
    });
  });
});

// Create new permission
router.post('/', authenticateToken, checkPermission('Permissions', 'create'), validate('permission'), (req, res) => {
  const { action, module_id } = req.body;

  // Check if module exists
  db.get('SELECT id FROM modules WHERE id = ?', [module_id], (err, module) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!module) {
      return res.status(400).json({ error: 'Module not found' });
    }

    // Check if permission already exists for this module and action
    db.get('SELECT id FROM permissions WHERE action = ? AND module_id = ?', [action, module_id], (err, existingPermission) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingPermission) {
        return res.status(400).json({ error: 'Permission already exists for this module and action' });
      }

      // Insert new permission
      db.run(
        'INSERT INTO permissions (action, module_id) VALUES (?, ?)',
        [action, module_id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create permission' });
          }

          res.status(201).json({
            id: this.lastID,
            action,
            module_id,
            message: 'Permission created successfully'
          });
        }
      );
    });
  });
});

// Update permission (only action can be updated)
router.put('/:id', authenticateToken, checkPermission('Permissions', 'update'), validateId, (req, res) => {
  const permissionId = req.params.id;
  const { action } = req.body;

  // Validate action
  const validActions = ['create', 'read', 'update', 'delete'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Must be one of: create, read, update, delete' });
  }

  // Check if permission exists
  db.get('SELECT * FROM permissions WHERE id = ?', [permissionId], (err, permission) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    // Check if new action conflicts with existing permission for same module
    db.get('SELECT id FROM permissions WHERE action = ? AND module_id = ? AND id != ?', 
      [action, permission.module_id, permissionId], (err, existingPermission) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingPermission) {
        return res.status(400).json({ error: 'Permission with this action already exists for this module' });
      }

      // Update permission
      db.run(
        'UPDATE permissions SET action = ? WHERE id = ?',
        [action, permissionId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to update permission' });
          }

          res.json({ message: 'Permission updated successfully' });
        }
      );
    });
  });
});

// Delete permission
router.delete('/:id', authenticateToken, checkPermission('Permissions', 'delete'), validateId, (req, res) => {
  const permissionId = req.params.id;

  // Check if permission exists
  db.get('SELECT id FROM permissions WHERE id = ?', [permissionId], (err, permission) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    // Delete permission (CASCADE will handle related records)
    db.run('DELETE FROM permissions WHERE id = ?', [permissionId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete permission' });
      }

      res.json({ message: 'Permission deleted successfully' });
    });
  });
});

// Get permissions grouped by module (for easy assignment)
router.get('/by-module/grouped', authenticateToken, checkPermission('Permissions', 'read'), (req, res) => {
  const query = `
    SELECT p.id, p.action, m.name as module_name, m.id as module_id
    FROM permissions p
    JOIN modules m ON p.module_id = m.id
    ORDER BY m.name, p.action
  `;

  db.all(query, (err, permissions) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch permissions' });
    }

    // Group permissions by module
    const grouped = {};
    permissions.forEach(permission => {
      if (!grouped[permission.module_name]) {
        grouped[permission.module_name] = {
          module_id: permission.module_id,
          module_name: permission.module_name,
          permissions: []
        };
      }
      grouped[permission.module_name].permissions.push({
        id: permission.id,
        action: permission.action
      });
    });

    res.json(Object.values(grouped));
  });
});

module.exports = router; 