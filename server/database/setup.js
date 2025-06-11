const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(':memory:');

// Initialize database schema
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Groups table
      db.run(`
        CREATE TABLE groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Roles table
      db.run(`
        CREATE TABLE roles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Modules table
      db.run(`
        CREATE TABLE modules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Permissions table
      db.run(`
        CREATE TABLE permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action VARCHAR(255) NOT NULL,
          module_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE CASCADE,
          UNIQUE(action, module_id)
        )
      `);

      // User-Group associations
      db.run(`
        CREATE TABLE user_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          group_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
          UNIQUE(user_id, group_id)
        )
      `);

      // Group-Role associations
      db.run(`
        CREATE TABLE group_roles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id INTEGER NOT NULL,
          role_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
          FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
          UNIQUE(group_id, role_id)
        )
      `);

      // Role-Permission associations
      db.run(`
        CREATE TABLE role_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          role_id INTEGER NOT NULL,
          permission_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
          FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE,
          UNIQUE(role_id, permission_id)
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          seedDatabase(resolve, reject);
        }
      });
    });
  });
};

// Seed initial data
const seedDatabase = async (resolve, reject) => {
  const bcrypt = require('bcryptjs');
  
  // Create default modules
  const modules = [
    ['Users', 'User management module'],
    ['Groups', 'Group management module'],
    ['Roles', 'Role management module'],
    ['Modules', 'Module management'],
    ['Permissions', 'Permission management']
  ];

  db.serialize(() => {
    const moduleStmt = db.prepare('INSERT INTO modules (name, description) VALUES (?, ?)');
    modules.forEach(module => {
      moduleStmt.run(module);
    });
    moduleStmt.finalize(() => {
      // After modules are inserted, create permissions
      const actions = ['create', 'read', 'update', 'delete'];
      
      db.all('SELECT id FROM modules', (err, moduleRows) => {
        if (err) {
          reject(err);
          return;
        }

        const permStmt = db.prepare('INSERT INTO permissions (action, module_id) VALUES (?, ?)');
        moduleRows.forEach(module => {
          actions.forEach(action => {
            permStmt.run(action, module.id);
          });
        });
        permStmt.finalize(() => {
          // After permissions are inserted, create admin role
          db.run('INSERT INTO roles (name, description) VALUES (?, ?)', 
            ['Admin', 'Full system administrator'], function(err) {
            if (err) {
              reject(err);
              return;
            }

            const adminRoleId = this.lastID;
            
            // Get all permissions and assign to admin role
            db.all('SELECT id FROM permissions', (err, permRows) => {
              if (err) {
                reject(err);
                return;
              }

              console.log(`Found ${permRows.length} permissions to assign to admin role`);

              const rolePermStmt = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
              permRows.forEach(perm => {
                rolePermStmt.run(adminRoleId, perm.id);
              });
              rolePermStmt.finalize(() => {
                // After role permissions are assigned, create admin group
                db.run('INSERT INTO groups (name, description) VALUES (?, ?)', 
                  ['Administrators', 'System administrators group'], function(err) {
                  if (err) {
                    reject(err);
                    return;
                  }

                  const adminGroupId = this.lastID;
                  
                  // Assign admin role to admin group
                  db.run('INSERT INTO group_roles (group_id, role_id) VALUES (?, ?)', 
                    [adminGroupId, adminRoleId], async (err) => {
                    if (err) {
                      reject(err);
                      return;
                    }

                    // Create default admin user
                    try {
                      const adminPassword = await bcrypt.hash('admin123', 10);
                      
                      db.run('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                        ['admin', 'joydaven@gmail.com', adminPassword], function(err) {
                        if (err) {
                          reject(err);
                          return;
                        }

                        const adminUserId = this.lastID;
                        
                        // Assign admin user to admin group
                        db.run('INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)',
                          [adminUserId, adminGroupId], (err) => {
                          if (err) {
                            reject(err);
                          } else {
                            console.log('Database initialized successfully with seed data');
                            console.log('🔑 Default admin account created:');
                            console.log('   Username: admin');
                            console.log('   Email: joydaven@gmail.com');
                            console.log('   Password: admin123');
                            console.log('   ⚠️  Please change the password after first login!');
                            resolve();
                          }
                        });
                      });
                    } catch (hashError) {
                      reject(hashError);
                    }
                  });
                });
              });
            });
          });
        });
      });
    });
  });
};

module.exports = { db, initializeDatabase }; 