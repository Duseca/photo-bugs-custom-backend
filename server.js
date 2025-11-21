// server.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import connectDB from './config/connectDB.js';
import Routes from './routes/index.js';

const app = express();

app.use(morgan('dev'));
app.use(cors({ origin: process.env.BASE_URL || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/api', Routes);
app.get('/', (req, res) => res.send('Base server route'));
app.get('/test', (req, res) => res.send('test main route'));

(async () => {
  try {
    await connectDB();
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => console.log(`Server running on ${PORT}`));

  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
})();
