# IAM Access Control System

A comprehensive Identity and Access Management (IAM) system built with React, Express, and SQLite. This system provides fine-grained permission management through users, groups, roles, and modules.

## Features

- **User Management**: Create, read, update, and delete users
- **Group Management**: Organize users into groups
- **Role Management**: Define roles with specific permissions
- **Module Management**: Manage business areas/modules
- **Permission Management**: Fine-grained CRUD permissions on modules
- **Access Control**: Users inherit permissions only through group membership
- **Permission Simulation**: Test user permissions before granting access
- **JWT Authentication**: Secure authentication with JWT tokens
- **Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS

## Technology Stack

### Backend
- **Node.js** with Express.js
- **SQLite** (in-memory) database
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Joi** for input validation
- **Helmet** for security headers
- **CORS** for cross-origin requests

### Frontend
- **React 18** with hooks
- **Redux Toolkit** for state management
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Axios** for API communication
- **React Hook Form** with Yup validation
- **Lucide React** for icons
- **React Hot Toast** for notifications

## Project Structure

```
IAM-StyleAccessControlSystem/
├── package.json                 # Root package.json with scripts
├── server/                      # Backend Express API
│   ├── package.json
│   ├── index.js                # Main server file
│   ├── database/
│   │   └── setup.js            # Database schema and seeding
│   ├── middleware/
│   │   ├── auth.js             # JWT and permission middleware
│   │   └── validation.js       # Input validation schemas
│   └── routes/
│       ├── auth.js             # Authentication routes
│       ├── users.js            # User CRUD routes
│       ├── groups.js           # Group CRUD routes
│       ├── roles.js            # Role CRUD routes
│       ├── modules.js          # Module CRUD routes
│       └── permissions.js      # Permission CRUD routes
├── client/                      # Frontend React app
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── main.jsx            # React entry point
│       ├── App.jsx             # Main app component
│       ├── index.css           # Global styles
│       ├── store/
│       │   ├── store.js        # Redux store
│       │   └── slices/
│       │       └── authSlice.js # Authentication state
│       ├── services/
│       │   └── api.js          # API service layer
│       ├── components/
│       │   └── Layout.jsx      # Main layout component
│       └── pages/
│           ├── Login.jsx       # Login/Register page
│           ├── Dashboard.jsx   # Main dashboard
│           ├── Users.jsx       # User management
│           ├── Groups.jsx      # Group management
│           ├── Roles.jsx       # Role management
│           ├── Modules.jsx     # Module management
│           └── Permissions.jsx # Permission management
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd IAM-StyleAccessControlSystem
   ```

2. **Install dependencies for all parts**
   ```bash
   npm run install-all
   ```

3. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start both the backend server (port 5000) and frontend development server (port 3000).

   The database will be automatically initialized with default data including an admin account.

### Alternative: Manual Setup

If you prefer to set up each part separately:

1. **Backend Setup**
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. **Frontend Setup** (in a new terminal)
   ```bash
   cd client
   npm install
   npm start
   ```

## Usage

### Getting Started

1. **Access the application**: Open http://localhost:3000 in your browser

2. **Login with admin account**: 
   - **Username**: `admin`
   - **Email**: `joydaven@gmail.com`
   - **Password**: `admin123`
   - ⚠️ **Important**: Change the password after first login!

3. **Or create a new account**: 
   - Click "Don't have an account? Sign up"
   - Register with username, email, and password
   - New users won't have permissions until assigned to groups

### Understanding the IAM Model

The system follows a strict hierarchy:

1. **Users** → belong to → **Groups**
2. **Groups** → have → **Roles** 
3. **Roles** → contain → **Permissions**
4. **Permissions** → define actions on → **Modules**

**Key Rules:**
- Users inherit permissions ONLY through group membership
- No direct user-to-permission assignments
- Permissions are always scoped to specific modules
- Available actions: create, read, update, delete

### Default Setup

The system comes pre-configured with:

**Modules:**
- Users (user management)
- Groups (group management)  
- Roles (role management)
- Modules (module management)
- Permissions (permission management)

**Permissions:** Each module has create, read, update, delete permissions

**Admin Role:** Has all permissions on all modules

**Admin Group:** Has the Admin role assigned

### Managing Access

1. **Create Groups**: Organize users by function (e.g., "Administrators", "Managers", "Viewers")

2. **Create Roles**: Define permission sets (e.g., "User Manager", "Read Only")

3. **Assign Permissions to Roles**: Select which actions each role can perform

4. **Assign Roles to Groups**: Give groups the appropriate roles

5. **Add Users to Groups**: Users automatically inherit group permissions

### Testing Permissions

Use the Dashboard's "Test Permissions" feature to:
- Select any user
- Choose a module and action
- See if that user has permission to perform the action

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me/permissions` - Get current user permissions
- `POST /api/auth/simulate-action` - Test user permissions

### Users
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Groups
- `GET /api/groups` - List all groups
- `GET /api/groups/:id` - Get group by ID
- `POST /api/groups` - Create new group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group
- `POST /api/groups/:id/users` - Assign users to group
- `DELETE /api/groups/:id/users` - Remove users from group
- `POST /api/groups/:id/roles` - Assign roles to group

### Roles
- `GET /api/roles` - List all roles
- `GET /api/roles/:id` - Get role by ID
- `POST /api/roles` - Create new role
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role
- `POST /api/roles/:id/permissions` - Assign permissions to role
- `DELETE /api/roles/:id/permissions` - Remove permissions from role

### Modules
- `GET /api/modules` - List all modules
- `GET /api/modules/:id` - Get module by ID
- `POST /api/modules` - Create new module
- `PUT /api/modules/:id` - Update module
- `DELETE /api/modules/:id` - Delete module

### Permissions
- `GET /api/permissions` - List all permissions
- `GET /api/permissions/:id` - Get permission by ID
- `POST /api/permissions` - Create new permission
- `PUT /api/permissions/:id` - Update permission
- `DELETE /api/permissions/:id` - Delete permission
- `GET /api/permissions/by-module/grouped` - Get permissions grouped by module

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for secure password storage
- **Input Validation**: Joi schemas for all API inputs
- **Permission Checks**: Middleware validates permissions on every protected route
- **Rate Limiting**: Prevents abuse with request rate limiting
- **Security Headers**: Helmet.js for security headers
- **CORS Protection**: Configured for frontend domain only

## Development

### Adding New Features

1. **Backend**: Add routes in `server/routes/`, update validation schemas
2. **Frontend**: Add components in `client/src/`, update Redux state if needed
3. **Database**: Modify schema in `server/database/setup.js`

### Environment Variables

Create `.env` files for configuration:

**Server (.env)**
```
PORT=5000
JWT_SECRET=your-secret-key-here
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

**Client (.env)**
```
VITE_API_URL=http://localhost:5000/api
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change ports in package.json scripts
2. **Database issues**: Database is in-memory, restart server to reset
3. **Permission errors**: Check user group membership and role assignments
4. **CORS errors**: Verify frontend URL in server CORS config

### Database Reset

Since the database is in-memory, simply restart the server to reset all data.

### Manual Database Seeding

If you need to reset the database manually:

```bash
cd server
npm run seed
```

### Default Admin Credentials

- **Username**: `admin`
- **Email**: `joydaven@gmail.com`  
- **Password**: `admin123`

The admin user has full permissions to all modules and can manage other users, groups, and roles.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details 