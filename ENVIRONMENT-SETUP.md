# Environment Setup Guide

This project requires environment variables for both backend and frontend components.

## Backend Environment (.env)

The backend environment file should be placed in the **root directory**.

### Setup:
```bash
# Copy the template
cp environment-template.txt .env

# Edit the values as needed
```

### Variables:

#### Server Configuration
- `PORT=5000` - Backend server port
- `NODE_ENV=development` - Environment mode (development/production)
- `FRONTEND_URL=http://localhost:3001` - Frontend URL for CORS

#### JWT Configuration
- `JWT_SECRET` - **IMPORTANT**: Change this to a strong random string in production
- `JWT_EXPIRES_IN=24h` - JWT token expiration time

#### Database Configuration
- `DB_TYPE=sqlite` - Database type
- `DB_MEMORY=true` - Use in-memory database
- `DB_PATH=:memory:` - Database file path

#### Security Configuration
- `BCRYPT_SALT_ROUNDS=12` - Password hashing strength
- `RATE_LIMIT_WINDOW_MS=900000` - Rate limiting window (15 minutes)
- `RATE_LIMIT_MAX_REQUESTS=100` - Max requests per window

#### CORS Configuration
- `ALLOWED_ORIGINS` - Comma-separated list of allowed origins

#### Admin User (for seeding)
- `ADMIN_USERNAME=admin`
- `ADMIN_EMAIL=joydaven@gmail.com` 
- `ADMIN_PASSWORD=admin123`

## Frontend Environment (client/.env)

The frontend environment file should be placed in the **client directory**.

### Setup:
```bash
cd client
cp environment-template.txt .env
```

### Variables:

#### API Configuration
- `VITE_API_URL=http://localhost:5000/api` - Backend API URL

#### App Configuration
- `VITE_APP_NAME=IAM Access Control System` - Application name
- `VITE_APP_VERSION=1.0.0` - Application version

#### Development Configuration
- `VITE_DEV_MODE=true` - Enable development features
- `VITE_ENABLE_CONSOLE_LOGS=true` - Enable console logging

## File Structure

```
IAM-StyleAccessControlSystem/
├── .env                           # Backend environment (Node.js)
├── environment-template.txt       # Backend template
├── client/
│   ├── .env                      # Frontend environment (Vite)
│   └── environment-template.txt  # Frontend template
```

## Important Notes

### Security
1. **Never commit `.env` files** - They are in `.gitignore`
2. **Change JWT_SECRET** in production to a strong random string
3. **Update default admin credentials** in production

### Development vs Production

#### Development (Current Setup)
- Uses in-memory SQLite database
- Detailed error messages
- CORS allows localhost origins
- Console logging enabled

#### Production Considerations
- Use persistent database (file-based SQLite or PostgreSQL/MySQL)
- Set `NODE_ENV=production`
- Use strong JWT secret
- Configure proper CORS origins
- Disable detailed error messages
- Use environment-specific URLs

### Vite Environment Variables

In Vite (frontend), environment variables must be prefixed with `VITE_` to be accessible in the browser:

```javascript
// ✅ Accessible
const apiUrl = import.meta.env.VITE_API_URL;

// ❌ Not accessible (no VITE_ prefix)
const secret = import.meta.env.SECRET_KEY;
```

## Quick Start

1. **Backend Setup:**
   ```bash
   cp environment-template.txt .env
   # Edit .env if needed
   cd server && npm start
   ```

2. **Frontend Setup:**
   ```bash
   cd client
   cp environment-template.txt .env
   # Edit .env if needed
   npm run dev
   ```

Both servers will use their respective environment files automatically. 