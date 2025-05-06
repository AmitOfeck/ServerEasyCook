import express, { Request, Response, NextFunction } from 'express';
import * as dotenv from 'dotenv';
dotenv.config({ path: `./config/.env.${process.env.NODE_ENV || 'local'}` });
import mongoose from 'mongoose';
import userRouter from './routes/user_routes';
import dishRouter from './routes/dish_routes'
import authRouter from './routes/auth_routes';
import searchRouter from './routes/search_routes';
import shoppingListRoutes from './routes/shopping_list_routes';
import cartRoutes from './routes/cart_routes';
import cors from 'cors';
import path from "path";


const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use('/auth', authRouter);
app.use('/user', userRouter);
app.use('/dish', dishRouter);
app.use('/search', searchRouter);
app.use('/shopping-list', shoppingListRoutes);
app.use('/cart', cartRoutes);

app.use('/uploads', express.static(path.join(__dirname, '..', '/uploads')));

mongoose
  .connect(process.env.DB_URL as string) 
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.log('Error connecting to MongoDB:', err);
  });


app.get('/', (req: Request, res: Response) => {
    res.send('Welcome to my TypeScript Express server!');
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
