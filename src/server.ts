import express, { Request, Response, NextFunction } from 'express';
import * as dotenv from 'dotenv';


const app = express();

dotenv.config({ path: './config/.env.local' });
const PORT = process.env.PORT || 4000;

const dbUrl = process.env.DB_URL;
console.log('Database URL:', dbUrl);

app.use(express.json());

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
