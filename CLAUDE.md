# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NightX Hub is a three-service full-stack application for Roblox script distribution with a freemium access model. It consists of a Next.js frontend, Express.js whitelist backend, and dedicated ads-api for key management.

### Tech Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Express.js with JWT authentication, security middleware
- **Ads-API**: Express.js with MongoDB for key/user operations
- **Database**: MongoDB with Mongoose ODM across all services
- **Package Managers**: pnpm (frontend), npm (backend/ads-api)
- **Deployment**: PM2 with unified ecosystem configuration for all three services

## Development Commands

### Workspace Commands (from root)
```bash
# Install all dependencies (frontend, backend, ads-api)
npm run install:all

# Development (all three services)
npm run dev

# Production build
npm run build

# Start all production servers
npm run start

# PM2 deployment
npm run pm2:start
npm run pm2:stop
npm run pm2:restart

# Individual service development
npm run dev:frontend
npm run dev:backend  
npm run dev:ads-api

# Individual service production
npm run start:frontend
npm run start:backend
npm run start:ads-api

# Cleanup
npm run clean        # Remove all node_modules
npm run setup:prod   # Full production setup
```

### Frontend Commands (from frontend/)
```bash
pnpm install          # Install dependencies
pnpm dev             # Development server (port 3000)
pnpm build           # Production build
pnpm start           # Production server (port 4950)
pnpm lint            # Lint code
```

### Backend Commands (from backend/)
```bash
npm install          # Install dependencies
npm start            # Production server (port 4949)
npm run dev          # Development with nodemon
```

### Ads-API Commands (from ads-api/)
```bash
npm install          # Install dependencies
npm start            # Production server (port 4547)
npm run dev          # Development with nodemon
```

## Architecture

### Frontend (nightx-hub/frontend/)
- **Framework**: Next.js 15 with App Router, React 19, TypeScript
- **Port**: 4950 (production), 3000 (development)
- **Key Features**:
  - Token-based user identification via UUID cookies
  - Progress tracking dashboard with real-time updates
  - Key management and generation interface
  - Checkpoint system for freemium access model
  - Integration with monetization services (Linkvertise, LootLab)
- **UI**: Radix UI primitives with custom Tailwind CSS styling
- **Animations**: Framer Motion with gradient themes and smooth transitions
- **Forms**: React Hook Form with Zod validation
- **State**: Built-in React hooks and local state management

### Backend (nightx-hub/backend/)
- **Framework**: Express.js with comprehensive security middleware
- **Port**: 4949 (production)
- **Purpose**: Whitelist authentication and JWT session management
- **Security**: JWT tokens, Helmet, CORS, CSRF protection, cookie parsing
- **Logging**: Winston for structured logging
- **Key Features**:
  - User authentication and session validation
  - JWT token generation and verification
  - Security middleware stack
  - Request/response logging

### Ads-API (nightx-hub/ads-api/)
- **Framework**: Express.js with MongoDB integration
- **Port**: 4547 (production)
- **Database**: MongoDB with Mongoose ODM
- **Purpose**: Core business logic for key and user management
- **Key Features**:
  - User progress tracking and management
  - Key generation with time-based expiration
  - Hardware ID (HWID) binding for keys
  - Integration with external monetization services
  - Progress-based freemium access system

## Database Models

### User Model (ads-api/models/User.js)
```javascript
{
  token: String (UUID, unique),           // User identification token
  progress: Number (default: 0),          // Available progress points
  keys: [String],                         // Array of owned key IDs
  latestSourceVerified: String,           // "linkvertise"|"lootlab"|null
  lastSourceTimestamp: Date,              // Last external service interaction
  createdAt: Date (default: now)          // Account creation timestamp
}
```

### Key Model (ads-api/models/Key.js)
```javascript
{
  ownerToken: String (required),          // UUID of key owner
  key: String (unique, required),         // Generated key (hex format)
  hwid: String,                          // Hardware ID binding
  expiresAt: Date (required),            // Key expiration timestamp
  used: Boolean (default: false),        // Key usage status
  salt: String (required),               // Security salt for key generation
  executionCount: Number (default: 0),   // Number of times key was used
  lastExecuted: Date                     // Last execution timestamp
}
```

## API Integration

### Ads-API Endpoints (Port 4547)
- **POST /key/create**: Generate new keys using user progress
- **POST /key/extend**: Extend existing key duration
- **GET/POST /user/***: User management and progress operations
- **POST /lootlab**: Integration with LootLab monetization service
- **GET /redirect**: Handle redirects from external services

### Backend Endpoints (Port 4949)
- JWT authentication and session management
- User whitelist validation
- Token generation and verification

### External API Integration (Frontend)
- `https://api.nighthub.pro/` for additional key operations
- User progress synchronization
- External service callback handling

## PM2 Configuration

The unified PM2 setup runs all three services:
- **nightx-hub-frontend**: Next.js on port 4950
- **nightx-hub-backend**: Express.js whitelist service on port 4949
- **nightx-hub-ads-api**: Express.js ads/key API on port 4547

All services are managed through the root `ecosystem.config.js` file with automatic restarts and environment configuration.

## Development Guidelines

### Frontend Development
- Use TypeScript strict mode
- Follow component composition patterns
- Implement proper loading states
- Use absolute imports with `@/` prefix
- Client-side rendering with `"use client"`

### Backend Development
- Follow Express.js best practices
- Implement proper error handling
- Use Mongoose for database operations
- Maintain security middleware stack
- Structure routes in dedicated files

### Security Considerations
- JWT token validation on backend
- CORS configuration for cross-origin requests
- Input validation and sanitization
- Secure cookie handling for tokens
- Rate limiting and request validation

## Environment Variables

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend (.env)
```bash
PORT=4949
JWT_SECRET=your-jwt-secret
NODE_ENV=production
```

### Ads-API (.env)
```bash
PORT=4547
MONGODB_URI=mongodb://localhost:27017/nightx-hub
NODE_ENV=production
```

## Deployment Notes

- Frontend builds are optimized with Next.js production builds
- All backend services use production-grade security middleware
- PM2 handles process management, monitoring, and auto-restart for all three services
- Services can be scaled independently via PM2 cluster mode
- Logs are managed through Winston (backend) and PM2 with log rotation
- MongoDB connection pooling across ads-api service for optimal performance
- Environment-specific configurations via ecosystem.config.js