import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

type Payload = {
  _id?: string;
  userId?: string;
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  let token = req.header('Authorization');
  if (!token) { res.status(401).send('Access Denied'); return; }

  token = token.replace(/^Bearer\s+/i, '');          // ← remove “Bearer ”

  if (!process.env.TOKEN_SECRET) { res.status(500).send('Server Error'); return; }

  jwt.verify(token, process.env.TOKEN_SECRET, (err, payload) => {
    if (err) { res.status(401).send('Access Denied'); return; }

    const id = (payload as Payload).userId || (payload as Payload)._id;  // ← accept either key
    if (!id) { res.status(401).send('Access Denied'); return; }

    (req as any).userId = id;
    next();
  });
};
