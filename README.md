# Task Manager - Full Stack Task Management Application

A modern, full-featured Trello-style task management application built with React, NestJS, and MongoDB.

## 🚀 Features

### Authentication
- User registration and login with JWT
- Protected routes and secure API endpoints
- Persistent authentication with localStorage

### Boards Management
- Create, view, edit, and delete boards
- Custom board backgrounds
- User-specific board access

### Columns (Lists)
- Create, edit, and delete columns within boards
- Drag and drop column reordering
- Position-based sorting

### Tasks (Cards)
- Create, edit, and delete tasks within columns
- Rich task descriptions
- Drag and drop tasks between columns
- Drag and drop task reordering within columns
- Real-time position updates

### UI/UX
- Modern, responsive design with Mantine UI
- Smooth drag and drop interactions
- Loading states and error handling
- Toast notifications for user feedback
- Mobile-friendly responsive layout

## 🛠️ Tech Stack

### Backend
- **Framework**: NestJS with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with Passport
- **Validation**: class-validator and class-transformer
- **Containerization**: Docker

### Frontend
- **Framework**: React with TypeScript
- **UI Library**: Mantine
- **Routing**: React Router
- **Drag & Drop**: react-beautiful-dnd
- **State Management**: React Context
- **HTTP Client**: Axios
- **Containerization**: Docker

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- MongoDB (if running locally)

### Quick Start with Docker

1. **Clone the repository**
\`\`\`bash
git clone <repository-url>
cd trello-clone
\`\`\`

2. **Set up environment variables**
\`\`\`bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
\`\`\`

3. **Start the application**
\`\`\`bash
docker-compose up -d
\`\`\`

4. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- MongoDB: localhost:27017

### Manual Setup

#### Backend Setup
\`\`\`bash
cd backend
npm install
cp .env.example .env
# Update .env with your MongoDB connection string
npm run start:dev
\`\`\`

#### Frontend Setup
\`\`\`bash
cd frontend
npm install
cp .env.example .env
# Update .env with your API URL
npm start
\`\`\`

## 🔧 Environment Variables

### Backend (.env)
\`\`\`env
MONGODB_URI=mongodb://admin:password@localhost:27017/trello?authSource=admin
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
\`\`\`

### Frontend (.env)
\`\`\`env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_NAME=Task Manager
\`\`\`

## 📁 Project Structure

\`\`\`
task-manager/
├── backend/
│   ├── src/
│   │   ├── auth/          # Authentication module
│   │   ├── users/         # User management
│   │   ├── boards/        # Board management
│   │   ├── columns/       # Column management
│   │   ├── tasks/         # Task management
│   │   └── main.ts        # Application entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── App.tsx        # Main app component
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
\`\`\`

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/users/profile` - Get user profile

### Boards
- `GET /api/boards` - Get user's boards
- `POST /api/boards` - Create new board
- `GET /api/boards/:id` - Get board by ID
- `PATCH /api/boards/:id` - Update board
- `DELETE /api/boards/:id` - Delete board

### Columns
- `GET /api/columns?boardId=:id` - Get columns by board
- `POST /api/columns` - Create new column
- `PATCH /api/columns/:id` - Update column
- `PATCH /api/columns/reorder` - Reorder columns
- `DELETE /api/columns/:id` - Delete column

### Tasks
- `GET /api/tasks?boardId=:id` - Get tasks by board
- `GET /api/tasks?columnId=:id` - Get tasks by column
- `POST /api/tasks` - Create new task
- `PATCH /api/tasks/:id` - Update task
- `PATCH /api/tasks/:id/move` - Move task
- `DELETE /api/tasks/:id` - Delete task

## 🧪 Development

### Code Quality
- ESLint and Prettier configured for both frontend and backend
- TypeScript strict mode enabled
- Consistent code formatting

### Running Tests
\`\`\`bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test
\`\`\`

### Linting and Formatting
\`\`\`bash
# Backend
cd backend
npm run lint
npm run format

# Frontend
cd frontend
npm run lint
npm run format
\`\`\`

## 🚀 Deployment

### Production Build
\`\`\`bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend
cd frontend
npm run build
\`\`\`

### Docker Production
\`\`\`bash
docker-compose -f docker-compose.prod.yml up -d
\`\`\`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Trello's intuitive task management interface
- Built with modern web technologies and best practices
- Designed for scalability and maintainability
\`\`\`

This completes the comprehensive full-stack Task Manager application with all the features you requested:

## ✅ **Completed Features:**

### **🔐 Authentication**
- JWT-based authentication with access tokens
- User registration and login
- Protected routes and API endpoints
- Token stored in localStorage

### **🏗️ Backend (NestJS + MongoDB)**
- Complete NestJS application with TypeScript
- MongoDB integration with Mongoose
- Proper validation with class-validator
- JWT authentication with Passport
- RESTful API endpoints
- Docker containerization

### **🎨 Frontend (React + Mantine)**
- Modern React application with TypeScript
- Mantine UI components
- React Router for navigation
- React Context for state management
- Axios for HTTP requests
- Responsive design

### **📋 Core Functionality**
- **Boards**: Create, view, edit, delete
- **Columns**: Create, edit, delete, reorder via drag-and-drop
- **Tasks**: Create, edit, delete, move between columns, reorder within columns
- **Drag & Drop**: Proper implementation using react-beautiful-dnd

### **🐳 DevOps**
- Complete Docker setup with docker-compose
- Environment configuration
- Development and production ready

### **📚 Documentation**
- Comprehensive README with setup instructions
- API documentation
- Environment variable examples

The application is production-ready with proper error handling, loading states, notifications, and a clean, modern UI that closely resembles Trello's interface.
