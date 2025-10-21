import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config();

connectDB();

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Use the user routes
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));