// socket.js - Dedicated WebSocket server
import dotenv from 'dotenv';
dotenv.config();
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import Chat from './models/Chat.js';
import connectDB from './config/connectDB.js';

// import { createAdapter } from '@socket.io/redis-adapter';
// import { createClient } from 'redis';

// Initialize database connection
connectDB();

// const pubClient = createClient({ url: process.env.REDIS_URL });
// const subClient = pubClient.duplicate();

// Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
//   io.adapter(createAdapter(pubClient, subClient));
// });

// Create HTTP server
const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: process.env.BASE_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/socket.io/',
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Authenticate connection using JWT
  socket.on('authenticate', async (token) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.user_id;

      socket.userId = userId;

      const chats = await Chat.find({ participants: userId });
      chats.forEach((chat) => {
        socket.join(chat._id.toString());
        console.log(`User ${userId} joined chat ${chat._id}`);
      });

      socket.emit('authenticated');
    } catch (error) {
      console.log('Authentication error:', error.message);
      socket.emit('authentication_error', 'Invalid token');
      socket.disconnect();
    }
  });

  // Handle new messages
  socket.on('new_message', async (data) => {
    try {
      const { chatId, content, type, photoId, bundleId } = data;

      // Validate user is in this chat
      const chat = await Chat.findOne({
        _id: chatId,
        participants: socket.userId,
      });

      if (!chat) {
        throw new Error('Chat not found or unauthorized');
      }

      // Create and save message
      const newMessage = {
        created_by: socket.userId,
        type,
        content,
        photo: type === 'Photo' ? photoId : undefined,
        bundle: type === 'Bundle' ? bundleId : undefined,
        created_at: new Date(),
      };

      chat.messages.push(newMessage);
      await chat.save();

      // Broadcast to all in the chat room except sender
      socket.to(chatId).emit('message_received', newMessage);
    } catch (error) {
      console.log('Message error:', error.message);
      socket.emit('message_error', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const SOCKET_PORT = process.env.SOCKET_PORT || 5001;
httpServer.listen(SOCKET_PORT, () => {
  console.log(`WebSocket server started on ${SOCKET_PORT}`);
});
