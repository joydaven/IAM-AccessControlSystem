const express = require('express');
const { db } = require('../database/setup');
const { authenticateToken, checkPermission } = require('../middleware/auth');
const { validate, validateId } = require('../middleware/validation');

const router = express.Router();

// Get all groups
router.get('/', authenticateToken, checkPermission('Groups', 'read'), (req, res) => {
  const query = `
    SELECT g.id, g.name, g.description, g.created_at,
           COUNT(DISTINCT ug.user_id) as user_count,
           COUNT(DISTINCT gr.role_id) as role_count
    FROM groups g
    LEFT JOIN user_groups ug ON g.id = ug.group_id
    LEFT JOIN group_roles gr ON g.id = gr.group_id
    GROUP BY g.id, g.name, g.description, g.created_at
    ORDER BY g.name
  `;

  db.all(query, (err, groups) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch groups' });
    }

    res.json(groups);
  });
});

// Get group by ID with users and roles
router.get('/:id', authenticateToken, checkPermission('Groups', 'read'), validateId, (req, res) => {
  const groupId = req.params.id;

  // Get group details
  db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, group) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch group' });
    }

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Get users in this group
    const usersQuery = `
      SELECT u.id, u.username, u.email
      FROM users u
      JOIN user_groups ug ON u.id = ug.user_id
      WHERE ug.group_id = ?
      ORDER BY u.username
    `;

    db.all(usersQuery, [groupId], (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch group users' });
      }

      // Get roles assigned to this group
      const rolesQuery = `
        SELECT r.id, r.name, r.description
        FROM roles r
        JOIN group_roles gr ON r.id = gr.role_id
        WHERE gr.group_id = ?
        ORDER BY r.name
      `;

      db.all(rolesQuery, [groupId], (err, roles) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch group roles' });
        }

        res.json({
          ...group,
          users,
          roles
        });
      });
    });
  });
});

// Create new group
router.post('/', authenticateToken, checkPermission('Groups', 'create'), validate('group'), (req, res) => {
  const { name, description } = req.body;

  // Check if group name already exists
  db.get('SELECT id FROM groups WHERE name = ?', [name], (err, existingGroup) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (existingGroup) {
      return res.status(400).json({ error: 'Group name already exists' });
    }

    // Insert new group
    db.run(
      'INSERT INTO groups (name, description) VALUES (?, ?)',
      [name, description || null],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create group' });
        }

        res.status(201).json({
          id: this.lastID,
          name,
          description: description || null,
          message: 'Group created successfully'
        });
      }
    );
  });
});

// Update group
router.put('/:id', authenticateToken, checkPermission('Groups', 'update'), validateId, validate('group'), (req, res) => {
  const groupId = req.params.id;
  const { name, description } = req.body;

  // Check if group exists
  db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, group) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if name is taken by another group
    db.get('SELECT id FROM groups WHERE name = ? AND id != ?', [name, groupId], (err, existingGroup) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingGroup) {
        return res.status(400).json({ error: 'Group name already exists' });
      }

      // Update group
      db.run(
        'UPDATE groups SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, description || null, groupId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to update group' });
          }

          res.json({ message: 'Group updated successfully' });
        }
      );
    });
  });
});

// Delete group
router.delete('/:id', authenticateToken, checkPermission('Groups', 'delete'), validateId, (req, res) => {
  const groupId = req.params.id;

  // Check if group exists
  db.get('SELECT id FROM groups WHERE id = ?', [groupId], (err, group) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Delete group (CASCADE will handle related records)
    db.run('DELETE FROM groups WHERE id = ?', [groupId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete group' });
      }

      res.json({ message: 'Group deleted successfully' });
    });
  });
});

// Assign users to group
router.post('/:id/users', authenticateToken, checkPermission('Groups', 'update'), validateId, validate('assignUsers'), (req, res) => {
  const groupId = req.params.id;
  const { userIds } = req.body;

  // Check if group exists
  db.get('SELECT id FROM groups WHERE id = ?', [groupId], (err, group) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Verify all users exist
    const placeholders = userIds.map(() => '?').join(',');
    db.all(`SELECT id FROM users WHERE id IN (${placeholders})`, userIds, (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (users.length !== userIds.length) {
        return res.status(400).json({ error: 'One or more users not found' });
      }

      // Remove existing assignments for these users to this group
      db.run(`DELETE FROM user_groups WHERE group_id = ? AND user_id IN (${placeholders})`, 
        [groupId, ...userIds], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to clear existing assignments' });
        }

        // Add new assignments
        const stmt = db.prepare('INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)');
        let completed = 0;
        let hasError = false;

        userIds.forEach(userId => {
          stmt.run(userId, groupId, (err) => {
            if (err && !hasError) {
              hasError = true;
              return res.status(500).json({ error: 'Failed to assign users to group' });
            }

            completed++;
            if (completed === userIds.length && !hasError) {
              res.json({ message: 'Users assigned to group successfully' });
            }
          });
        });

        stmt.finalize();
      });
    });
  });
});

// Remove users from group
router.delete('/:id/users', authenticateToken, checkPermission('Groups', 'update'), validateId, validate('assignUsers'), (req, res) => {
  const groupId = req.params.id;
  const { userIds } = req.body;

  // Check if group exists
  db.get('SELECT id FROM groups WHERE id = ?', [groupId], (err, group) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Remove users from group
    const placeholders = userIds.map(() => '?').join(',');
    db.run(`DELETE FROM user_groups WHERE group_id = ? AND user_id IN (${placeholders})`, 
      [groupId, ...userIds], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to remove users from group' });
      }

      res.json({ 
        message: 'Users removed from group successfully',
        removedCount: this.changes
      });
    });
  });
});

// Assign roles to group
router.post('/:id/roles', authenticateToken, checkPermission('Groups', 'update'), validateId, validate('assignRoles'), (req, res) => {
  const groupId = req.params.id;
  const { roleIds } = req.body;

  // Check if group exists
  db.get('SELECT id FROM groups WHERE id = ?', [groupId], (err, group) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Verify all roles exist
    const placeholders = roleIds.map(() => '?').join(',');
    db.all(`SELECT id FROM roles WHERE id IN (${placeholders})`, roleIds, (err, roles) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (roles.length !== roleIds.length) {
        return res.status(400).json({ error: 'One or more roles not found' });
      }

      // Remove existing assignments
      db.run(`DELETE FROM group_roles WHERE group_id = ? AND role_id IN (${placeholders})`, 
        [groupId, ...roleIds], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to clear existing assignments' });
        }

        // Add new assignments
        const stmt = db.prepare('INSERT INTO group_roles (group_id, role_id) VALUES (?, ?)');
        let completed = 0;
        let hasError = false;

        roleIds.forEach(roleId => {
          stmt.run(groupId, roleId, (err) => {
            if (err && !hasError) {
              hasError = true;
              return res.status(500).json({ error: 'Failed to assign roles to group' });
            }

            completed++;
            if (completed === roleIds.length && !hasError) {
              res.json({ message: 'Roles assigned to group successfully' });
            }
          });
        });

        stmt.finalize();
      });
    });
  });
});

// Remove roles from group
router.delete('/:id/roles', authenticateToken, checkPermission('Groups', 'update'), validateId, validate('assignRoles'), (req, res) => {
  const groupId = req.params.id;
  const { roleIds } = req.body;

  // Check if group exists
  db.get('SELECT id FROM groups WHERE id = ?', [groupId], (err, group) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Remove roles from group
    const placeholders = roleIds.map(() => '?').join(',');
    db.run(`DELETE FROM group_roles WHERE group_id = ? AND role_id IN (${placeholders})`, 
      [groupId, ...roleIds], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to remove roles from group' });
      }

      res.json({ 
        message: 'Roles removed from group successfully',
        removedCount: this.changes
      });
    });
  });
});

module.exports = router; 