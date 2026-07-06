# SupportCue - AI-Powered Customer Support SaaS Platform

A complete MERN stack SaaS application that provides intelligent AI-powered customer support with seamless human agent handoff capabilities.

## Features

- 🤖 **AI-First Support**: Start conversations with AI that provides intelligent, contextual responses
- 🔄 **Seamless Handoff**: Automatic transition from AI to human agents when frustration is detected
- 📱 **Real-time Chat**: Live communication with Socket.IO for instant message delivery
- 🚨 **Smart Escalation**: Intelligent frustration detection using keyword analysis
- 👥 **Multi-role System**: Support for customers, agents
- 🎨 **Modern UI**: Clean, responsive interface built with React and Tailwind CSS

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Socket.IO** for real-time communication
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Google Gemini AI** integration

### Frontend
- **React 18** with functional components and hooks
- **Tailwind CSS** for styling
- **Socket.IO Client** for real-time features
- **React Router** for navigation
- **Axios** for HTTP requests

## Project Structure

```
├── backend/               # Backend application
│   ├── src/
│   │   ├── config/       # Configuration files
│   │   ├── controllers/  # Route controllers
│   │   ├── middleware/   # Custom middleware
│   │   ├── models/       # Mongoose models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic services
│   │   └── socket/       # Socket.IO handlers
│   ├── server.js         # Main server file
│   ├── package.json
│   └── env.example       # Environment variables example
├── frontend/             # Frontend application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── api/          # API service layer
│   │   └── App.jsx       # Main app component
│   └── package.json
├── db-backup/            # MongoDB dump files
└── README.md
```

## Prerequisites

- Node.js 16+ and npm
- MongoDB 4.4+
- Google Gemini API key (optional - fallback responses provided)

## Installation & Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd ai-support-platform
```

### 2. Backend Installation

Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

### 3. Frontend Installation

Navigate to the frontend directory and install dependencies:
```bash
cd frontend
npm install
```

### 4. Environment Variables Setup

#### Backend .env File

Create a `.env` file in the `backend` directory based on `backend/env.example`:

**On Windows:**
```bash
cd backend
copy env.example .env
```

**On Linux/Mac:**
```bash
cd backend
cp env.example .env
```

Edit the `.env` file with your configuration. Reference `backend/env.example` for the required variables:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/support_platform
JWT_SECRET=your_jwt_secret_here_make_it_long_and_random
GEMINI_API_KEY=your_gemini_api_key_here
FRUSTRATION_THRESHOLD=7
NODE_ENV=development
```

**Required Variables:**
- `PORT`: Server port (default: 5000)
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token signing (use a long, random string)
- `GEMINI_API_KEY`: Google Gemini API key (optional - system will use fallback responses if not provided)
- `FRUSTRATION_THRESHOLD`: Threshold for frustration detection (default: 7)
- `NODE_ENV`: Environment mode (development/production)

### 5. Database Setup

You have two options to set up the database:

#### Option 1: Restore Database Dump (Recommended)

If you have a MongoDB dump in the `db-backup` folder, restore it using:

```bash
mongorestore --db support_platform db-backup/support_platform
```

This will restore all collections (users, chats, notifications) with existing data.

#### Option 2: Run Seed Script (If Available)

If a seed script is available, run it to populate the database with initial data:

```bash
cd backend
npm run seed
```

**Note:** If no seed script exists, you can create users manually through the registration API endpoint (see Testing section below).

### 6. How to Run the Project

Open two separate terminal windows:

**Terminal 1 - Start Backend:**
```bash
cd backend && npm run dev
```

**Terminal 2 - Start Frontend:**
```bash
cd frontend && npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000 (or the port shown in the terminal)
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

## Testing the Platform

### 1. Create Test Users

**Create a Customer:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Customer",
    "email": "customer@example.com",
    "password": "password123",
    "role": "customer"
  }'
```

**Create an Agent:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sarah Agent",
    "email": "agent@example.com",
    "password": "password123",
    "role": "agent"
  }'
```

**Create an Admin:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "password123",
    "role": "admin"
  }'
```

### 2. Test Flow

1. **Open the home page** (http://localhost:3000)
2. **Click the chat widget** in the bottom-right corner
3. **Start a conversation** - AI will respond automatically
4. **Simulate frustration** by typing messages like:
   - "This is not helpful at all!"
   - "I'm getting really frustrated with this service"
   - "This is useless, I need a real person"
5. **Check agent dashboard** - frustration alerts will appear
6. **Agent takes over** - click "Take Over" button
7. **Continue conversation** in human mode

### 3. Test Socket.IO Events

**Join Chat:**
```javascript
// In browser console
const socket = io('http://localhost:5000');
socket.emit('joinChat', { chatId: 'your-chat-id', userId: 'your-user-id' });
```

**Send Message:**
```javascript
socket.emit('sendMessage', {
  chatId: 'your-chat-id',
  senderId: 'your-user-id',
  senderRole: 'customer',
  text: 'Hello, I need help!'
});
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/logout` - User logout

### Chat Management
- `POST /api/chat/create` - Create new chat
- `GET /api/chat/:chatId` - Get chat details
- `POST /api/chat/takeover` - Take over chat (agent only)
- `GET /api/chat/active` - Get active chats (agent/admin only)
- `PUT /api/chat/:chatId/close` - Close chat (agent/admin only)

### Admin Functions
- `GET /api/admin/notifications` - Get notifications
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/users` - Get all users (admin only)
- `PUT /api/admin/users/:userId/role` - Update user role (admin only)

## Socket.IO Events

### Client to Server
- `joinChat` - Join a chat room
- `joinAgents` - Join agents room
- `sendMessage` - Send a message
- `takeOver` - Take over a chat
- `typing` - Typing indicator

### Server to Client
- `chatHistory` - Chat history on join
- `receiveMessage` - New message received
- `chatTaken` - Chat taken over notification
- `frustrationAlert` - Frustration detection alert
- `userTyping` - User typing indicator
- `joinedAgents` - Confirmation of joining agents room

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `MONGO_URI` | MongoDB connection string | mongodb://localhost:27017/support_platform |
| `JWT_SECRET` | JWT signing secret | (required) |
| `GEMINI_API_KEY` | Google Gemini API key | (optional) |
| `GEMINI_BASE_URL` | Gemini REST endpoint override | https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent |
| `FRUSTRATION_THRESHOLD` | Frustration score threshold | 7 |
| `NODE_ENV` | Environment mode | development |

## Gemini AI Integration

The platform integrates with Google's Gemini AI for intelligent responses. If no API key is provided, the system falls back to predefined responses.

**Features:**
- Context-aware responses using conversation history
- Rate limiting (1 request per second per chat)
- Fallback responses for reliability
- System prompt for consistent AI persona



## Development

### Running in Development Mode
```bash
# Backend with auto-reload
cd server && npm run dev

# Frontend with hot reload
cd client && npm run dev
```

### Building for Production
```bash
# Frontend build
cd client && npm run build

# Backend start
cd server && npm start
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env`

2. **Socket.IO Connection Issues**
   - Verify CORS settings in server
   - Check if ports are available

3. **Gemini API Errors**
   - Verify API key is valid
   - Check rate limiting
   - System will fall back to predefined responses

4. **JWT Authentication Issues**
   - Ensure JWT_SECRET is set
   - Check token expiration

### Logs

The server provides detailed logging for:
- Database connections
- Socket events
- API requests
- Error handling
- Gemini API calls

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review server logs
3. Open an issue on GitHub

---

## Project Information

**Project Name:** SupportCue  
**Type:** SaaS (Software as a Service) Platform  
**Category:** Customer Support & Helpdesk Solution  
**Technology Stack:** MERN (MongoDB, Express.js, React, Node.js)

### Project Title for Report

**Recommended Report Title:**
"SupportCue: An AI-Powered Customer Support SaaS Platform with Intelligent Agent Handoff System"

**Alternative Titles:**
- "SupportCue - A Comprehensive AI-Driven Customer Support Solution"
- "Development of SupportCue: An Intelligent Customer Support Platform with Real-time AI-Human Collaboration"
- "SupportCue SaaS Platform: Integrating AI and Human Agents for Enhanced Customer Support Experience"

---

**Built with ❤️ using MERN Stack**

  

