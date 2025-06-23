import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import morgan from 'morgan';
import connectDB from './config/connectDB.js';
import cors from 'cors';
// import cookieParser from 'cookie-parser';

const app = express();

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());
app.use(cors());
app.use(morgan('dev'));

// Routes
// app.use('', Routes);

app.get('/', async (req, res) => {
  try {
    res.send('Base server route');
  } catch (error) {
    console.log(error);
  }
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server started on ${PORT}`));
