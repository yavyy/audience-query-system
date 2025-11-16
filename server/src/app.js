import express from 'express'
import http from 'http'
import { Server } from 'socket.io';
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express();
const server = http.createServer(app)

//socket.io setup
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  }
})

//global Middlewares
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())

//Make io accessible to routes
app.set('io', io)


//socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('disconnect', () => {
    console.log('User disconnected', socket.id)
  })
})


app.get('/', (req, res) => {
  res.json({ message: "Audience Query Management API" });
})

//importing routes
import authRoutes from './routes/auth.routes.js'
import queryRoutes from './routes/query.routes.js'
import userRoutes from './routes/user.routes.js'

//Routes
app.use('/api/auth', authRoutes)
app.use('/api/queries', queryRoutes)
app.use('/api/users', userRoutes)
// app.use('/api/analytics', analyticsRoutes)



// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  })
})



export { app, server, io }
