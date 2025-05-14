import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

type Payload = {
  _id: string;
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    res.status(401).send('Access Denied');
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).send('Access Denied');
    return;
  }

  const token = parts[1];
  const secret = process.env.TOKEN_SECRET;
  if (!secret) {
    res.status(500).send('Server Error');
    return;
  }

  jwt.verify(token, secret, (err, payload) => {
    if (err) {
      res.status(401).send('Access Denied');
      return;
    }
    (req as any).userId = (payload as Payload)._id;
    next();
  });
};