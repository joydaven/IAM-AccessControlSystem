const express = require('express');
const { db } = require('../database/setup');
const { authenticateToken, checkPermission } = require('../middleware/auth');
const { validate, validateId } = require('../middleware/validation');

const router = express.Router();

// Get all roles
router.get('/', authenticateToken, checkPermission('Roles', 'read'), (req, res) => {
  const query = `
    SELECT r.id, r.name, r.description, r.created_at,
           COUNT(DISTINCT gr.group_id) as group_count,
           COUNT(DISTINCT rp.permission_id) as permission_count
    FROM roles r
    LEFT JOIN group_roles gr ON r.id = gr.role_id
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    GROUP BY r.id, r.name, r.description, r.created_at
    ORDER BY r.name
  `;

  db.all(query, (err, roles) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch roles' });
    }

    res.json(roles);
  });
});

// Get role by ID with permissions
router.get('/:id', authenticateToken, checkPermission('Roles', 'read'), validateId, (req, res) => {
  const roleId = req.params.id;

  // Get role details
  db.get('SELECT * FROM roles WHERE id = ?', [roleId], (err, role) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch role' });
    }

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Get permissions assigned to this role
    const permissionsQuery = `
      SELECT p.id, p.action, m.name as module_name, m.id as module_id
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN modules m ON p.module_id = m.id
      WHERE rp.role_id = ?
      ORDER BY m.name, p.action
    `;

    db.all(permissionsQuery, [roleId], (err, permissions) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch role permissions' });
      }

      // Get groups that have this role
      const groupsQuery = `
        SELECT g.id, g.name, g.description
        FROM groups g
        JOIN group_roles gr ON g.id = gr.group_id
        WHERE gr.role_id = ?
        ORDER BY g.name
      `;

      db.all(groupsQuery, [roleId], (err, groups) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch role groups' });
        }

        res.json({
          ...role,
          permissions,
          groups
        });
      });
    });
  });
});

// Create new role
router.post('/', authenticateToken, checkPermission('Roles', 'create'), validate('role'), (req, res) => {
  const { name, description } = req.body;

  // Check if role name already exists
  db.get('SELECT id FROM roles WHERE name = ?', [name], (err, existingRole) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (existingRole) {
      return res.status(400).json({ error: 'Role name already exists' });
    }

    // Insert new role
    db.run(
      'INSERT INTO roles (name, description) VALUES (?, ?)',
      [name, description || null],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create role' });
        }

        res.status(201).json({
          id: this.lastID,
          name,
          description: description || null,
          message: 'Role created successfully'
        });
      }
    );
  });
});

// Update role
router.put('/:id', authenticateToken, checkPermission('Roles', 'update'), validateId, validate('role'), (req, res) => {
  const roleId = req.params.id;
  const { name, description } = req.body;

  // Check if role exists
  db.get('SELECT * FROM roles WHERE id = ?', [roleId], (err, role) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Check if name is taken by another role
    db.get('SELECT id FROM roles WHERE name = ? AND id != ?', [name, roleId], (err, existingRole) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingRole) {
        return res.status(400).json({ error: 'Role name already exists' });
      }

      // Update role
      db.run(
        'UPDATE roles SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, description || null, roleId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to update role' });
          }

          res.json({ message: 'Role updated successfully' });
        }
      );
    });
  });
});

// Delete role
router.delete('/:id', authenticateToken, checkPermission('Roles', 'delete'), validateId, (req, res) => {
  const roleId = req.params.id;

  // Check if role exists
  db.get('SELECT id FROM roles WHERE id = ?', [roleId], (err, role) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Delete role (CASCADE will handle related records)
    db.run('DELETE FROM roles WHERE id = ?', [roleId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete role' });
      }

      res.json({ message: 'Role deleted successfully' });
    });
  });
});

// Assign permissions to role
router.post('/:id/permissions', authenticateToken, checkPermission('Roles', 'update'), validateId, validate('assignPermissions'), (req, res) => {
  const roleId = req.params.id;
  const { permissionIds } = req.body;

  // Check if role exists
  db.get('SELECT id FROM roles WHERE id = ?', [roleId], (err, role) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Verify all permissions exist
    const placeholders = permissionIds.map(() => '?').join(',');
    db.all(`SELECT id FROM permissions WHERE id IN (${placeholders})`, permissionIds, (err, permissions) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (permissions.length !== permissionIds.length) {
        return res.status(400).json({ error: 'One or more permissions not found' });
      }

      // Remove existing assignments
      db.run(`DELETE FROM role_permissions WHERE role_id = ? AND permission_id IN (${placeholders})`, 
        [roleId, ...permissionIds], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to clear existing assignments' });
        }

        // Add new assignments
        const stmt = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
        let completed = 0;
        let hasError = false;

        permissionIds.forEach(permissionId => {
          stmt.run(roleId, permissionId, (err) => {
            if (err && !hasError) {
              hasError = true;
              return res.status(500).json({ error: 'Failed to assign permissions to role' });
            }

            completed++;
            if (completed === permissionIds.length && !hasError) {
              res.json({ message: 'Permissions assigned to role successfully' });
            }
          });
        });

        stmt.finalize();
      });
    });
  });
});

// Remove permissions from role
router.delete('/:id/permissions', authenticateToken, checkPermission('Roles', 'update'), validateId, validate('assignPermissions'), (req, res) => {
  const roleId = req.params.id;
  const { permissionIds } = req.body;

  // Check if role exists
  db.get('SELECT id FROM roles WHERE id = ?', [roleId], (err, role) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Remove permissions from role
    const placeholders = permissionIds.map(() => '?').join(',');
    db.run(`DELETE FROM role_permissions WHERE role_id = ? AND permission_id IN (${placeholders})`, 
      [roleId, ...permissionIds], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to remove permissions from role' });
      }

      res.json({ 
        message: 'Permissions removed from role successfully',
        removedCount: this.changes
      });
    });
  });
});

module.exports = router; 