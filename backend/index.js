import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import drishtiRoutes from './routes/drishtiRoutes.js';
import pathRoutes from './routes/path.js';
import ragRoutes from './routes/rag.js';

dotenv.config();

const app = express();

// CORS configuration
const allowedOrigins = [
   'http://localhost:5173', // Drishti frontend
   'http://localhost:5174', // Drishti frontend
   'http://localhost:5175', // Drishti frontend
   'http://localhost:5176', // Drishti frontend
   'http://localhost:5177', // Drishti frontend
   'https://drishti.netlify.app', // Production frontend
];

app.use(cors({
   origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman), explicitly allowed origins, and any localhost port
      if (!origin || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
         callback(null, true);
      } else {
         callback(new Error(`CORS blocked for origin: ${origin}`));
      }
   },
   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
   credentials: true,
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/drishti', drishtiRoutes);
app.use('/api/drishti/path', pathRoutes);
app.use('/api/rag', ragRoutes);

// MongoDB Connection
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/drishti';
        await mongoose.connect(mongoURI);
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        // Don't exit, continue without MongoDB for testing
        console.log('Running without MongoDB for testing...');
    }
};

connectDB();

// Basic route to test the server
app.get('/', (req, res) => {
   res.json({ message: 'Drishti AI API is running' });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
   console.log(`Drishti server is running on port ${PORT}`);
});
