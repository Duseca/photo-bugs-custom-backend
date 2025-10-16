// socket.js
import dotenv from 'dotenv';
dotenv.config();
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Chat from './models/Chat.js';
import connectDB from './config/connectDB.js';

(async () => {
  try {
    await connectDB();

    const httpServer = createServer();
    const io = new Server(httpServer, {
      cors: {
        origin: process.env.BASE_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/socket.io/',
    });

    io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);

      socket.on('authenticate', async (token) => {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const userId = decoded.user_id;
          socket.userId = userId;

          const chats = await Chat.find({ participants: userId });
          chats.forEach((chat) => socket.join(chat._id.toString()));

          socket.emit('authenticated');
        } catch (error) {
          console.log('Authentication error:', error.message);
          socket.emit('authentication_error', 'Invalid token');
          socket.disconnect();
        }
      });

      socket.on('new_message', async (data) => {
        if (!socket.userId) {
          return socket.emit('message_error', 'User not authenticated');
        }

        try {
          const { chatId, content, type, photoId, bundleId } = data;
          const chat = await Chat.findOne({ _id: chatId, participants: socket.userId });

          if (!chat) throw new Error('Chat not found or unauthorized');

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

          socket.emit('message_sent', newMessage);
          socket.to(chatId).emit('message_received', newMessage);
        } catch (error) {
          socket.emit('message_error', error.message);
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    const SOCKET_PORT = process.env.SOCKET_PORT || 5001;
    httpServer.listen(SOCKET_PORT, () =>
      console.log(`WebSocket server started on ${SOCKET_PORT}`)
    );
  } catch (err) {
    console.error('Server initialization failed:', err.message);
    process.exit(1);
  }
})();
