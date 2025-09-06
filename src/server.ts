import express, { Request, Response, NextFunction } from 'express';
import * as dotenv from 'dotenv';
import bodyParser from 'body-parser';
dotenv.config({ path: `./config/.env.${process.env.NODE_ENV || 'local'}` });
//dotenv.config();
import mongoose from 'mongoose';
import cors from 'cors';
import path from "path";


import userRouter from './routes/user_routes';
import dishRouter from './routes/dish_routes'
import authRouter from './routes/auth_routes';
import searchRouter from './routes/search_routes';
import fridgeRouter from './routes/fridge_routes';
import shoppingListRoutes from './routes/shopping_list_routes';
import cartRoutes from './routes/cart_routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());


app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }));



app.use('/uploads', express.static(path.join(__dirname, '..', '/uploads')));


app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/dish', dishRouter);
app.use('/search', searchRouter);
app.use('/shopping-list', shoppingListRoutes);
app.use('/fridge', fridgeRouter);
app.use('/cart', cartRoutes);

// MongoDB Connection
mongoose
  .connect(process.env.DB_URL as string) 
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('❌ Error connecting to MongoDB:', err);
  });

// Root endpoint
app.get('/', (req: Request, res: Response) => {
    res.send('Welcome to EasyCook API Server! 🍳');
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('❌ Global error handler:', err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});