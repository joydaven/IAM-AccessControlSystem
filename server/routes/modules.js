const express = require('express');
const { db } = require('../database/setup');
const { authenticateToken, checkPermission } = require('../middleware/auth');
const { validate, validateId } = require('../middleware/validation');

const router = express.Router();

// Get all modules
router.get('/', authenticateToken, checkPermission('Modules', 'read'), (req, res) => {
  const query = `
    SELECT m.id, m.name, m.description, m.created_at,
           COUNT(p.id) as permission_count
    FROM modules m
    LEFT JOIN permissions p ON m.id = p.module_id
    GROUP BY m.id, m.name, m.description, m.created_at
    ORDER BY m.name
  `;

  db.all(query, (err, modules) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch modules' });
    }

    res.json(modules);
  });
});

// Get module by ID with permissions
router.get('/:id', authenticateToken, checkPermission('Modules', 'read'), validateId, (req, res) => {
  const moduleId = req.params.id;

  // Get module details
  db.get('SELECT * FROM modules WHERE id = ?', [moduleId], (err, module) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch module' });
    }

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Get permissions for this module
    const permissionsQuery = `
      SELECT p.id, p.action, p.created_at
      FROM permissions p
      WHERE p.module_id = ?
      ORDER BY p.action
    `;

    db.all(permissionsQuery, [moduleId], (err, permissions) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch module permissions' });
      }

      res.json({
        ...module,
        permissions
      });
    });
  });
});

// Create new module
router.post('/', authenticateToken, checkPermission('Modules', 'create'), validate('module'), (req, res) => {
  const { name, description } = req.body;

  // Check if module name already exists
  db.get('SELECT id FROM modules WHERE name = ?', [name], (err, existingModule) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (existingModule) {
      return res.status(400).json({ error: 'Module name already exists' });
    }

    // Insert new module
    db.run(
      'INSERT INTO modules (name, description) VALUES (?, ?)',
      [name, description || null],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create module' });
        }

        const moduleId = this.lastID;

        // Create default permissions for this module
        const actions = ['create', 'read', 'update', 'delete'];
        const stmt = db.prepare('INSERT INTO permissions (action, module_id) VALUES (?, ?)');
        
        let completed = 0;
        actions.forEach(action => {
          stmt.run(action, moduleId, (err) => {
            completed++;
            if (completed === actions.length) {
              stmt.finalize();
              res.status(201).json({
                id: moduleId,
                name,
                description: description || null,
                message: 'Module created successfully with default permissions'
              });
            }
          });
        });
      }
    );
  });
});

// Update module
router.put('/:id', authenticateToken, checkPermission('Modules', 'update'), validateId, validate('module'), (req, res) => {
  const moduleId = req.params.id;
  const { name, description } = req.body;

  // Check if module exists
  db.get('SELECT * FROM modules WHERE id = ?', [moduleId], (err, module) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Check if name is taken by another module
    db.get('SELECT id FROM modules WHERE name = ? AND id != ?', [name, moduleId], (err, existingModule) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingModule) {
        return res.status(400).json({ error: 'Module name already exists' });
      }

      // Update module
      db.run(
        'UPDATE modules SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, description || null, moduleId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to update module' });
          }

          res.json({ message: 'Module updated successfully' });
        }
      );
    });
  });
});

// Delete module
router.delete('/:id', authenticateToken, checkPermission('Modules', 'delete'), validateId, (req, res) => {
  const moduleId = req.params.id;

  // Check if module exists
  db.get('SELECT id FROM modules WHERE id = ?', [moduleId], (err, module) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Delete module (CASCADE will handle related records)
    db.run('DELETE FROM modules WHERE id = ?', [moduleId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete module' });
      }

      res.json({ message: 'Module deleted successfully' });
    });
  });
});

module.exports = router; 