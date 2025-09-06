import { Request, Response } from 'express';
import userService from '../services/user_service';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { IUser } from '../models/user_model';
import { OAuth2Client } from 'google-auth-library';

type tTokens = { accessToken: string; refreshToken: string };

const ACCESS_EXPIRES  = process.env.TOKEN_EXPIRES         || '1h';
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '7d';

const generateToken = (_id: mongoose.mongo.BSON.ObjectId): tTokens | null => {
  if (!process.env.TOKEN_SECRET) return null;

  const accessToken = jwt.sign(
    { userId: _id },
    process.env.TOKEN_SECRET as string,
    { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    { userId: _id },
    process.env.TOKEN_SECRET as string,
    { expiresIn: REFRESH_EXPIRES } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
};

const login = async (req: Request, res: Response) => {
  try {
    const user = (await userService.getUserByEmail(req.body.email))[0];
    if (!user) { res.status(400).send('Wrong email or password'); return; }

    const ok = await bcrypt.compare(req.body.password, user.password);
    if (!ok) { res.status(400).send('Wrong email or password'); return; }

    const tokens = generateToken(user._id!);
    if (!tokens) { res.status(500).send('Server Error'); return; }

    res.status(200).send({
      userId: user._id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) { res.status(500).send(err); }
};

const verifyRefreshToken = (refreshToken: string | undefined) => {
  return new Promise<IUser>((resolve, reject) => {
    if (!refreshToken || !process.env.TOKEN_SECRET) { reject('fail'); return; }

    jwt.verify(refreshToken, process.env.TOKEN_SECRET, async (err: any, payload: any) => {
      if (err) { reject('fail'); return; }

      const _id = payload.userId;
      try {
        const user = await userService.getUserById(_id);
        user ? resolve(user) : reject('fail');
      } catch { reject('fail'); }
    });
  });
};

const refresh = async (req: Request, res: Response) => {
  try {
    const user = await verifyRefreshToken(req.body.refreshToken);
    const tokens = generateToken(user._id!);
    if (!tokens) { res.status(500).send('Server Error'); return; }

    res.status(200).send({
      userId: user._id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch { res.status(400).send('Fail'); }
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleSignin = async (req: Request, res: Response) => {
  try {
    console.log('[googleSignin] Starting Google sign-in process');
    
    const { token } = req.body;
    if (!token) {
      console.error('[googleSignin] No token provided');
      return res.status(400).send('Token is required');
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error('[googleSignin] GOOGLE_CLIENT_ID environment variable not set');
      return res.status(500).send('Server configuration error');
    }

    console.log('[googleSignin] Verifying token with Google');
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      console.error('[googleSignin] Invalid token payload');
      return res.status(400).send('Invalid token');
    }

    const email = payload.email;
    const googleId = payload.sub;
    console.log(`[googleSignin] Token verified for email: ${email}`);

    let user = (await userService.getUserByEmail(email))[0];
    if (!user) {
      console.log('[googleSignin] Creating new user');
      user = await userService.createUser({
        email: email,
        name: payload.name || '',
        userName: email.split('@')[0] || '',
        profileImage: payload.picture || '',
        password: 'google-signin',
        googleId,
        favoriteDishes: [],
        madeDishes: [],
      });
    } else {
      console.log('[googleSignin] User found, logging in');
    }

    const tokens = generateToken(user._id!);
    if (!tokens) { 
      console.error('[googleSignin] Failed to generate tokens');
      return res.status(500).send('Server Error'); 
    }

    console.log('[googleSignin] Success - tokens generated');
    res.status(200).send({
      userId: user._id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err: any) { 
    console.error('[googleSignin] Error:', err.message || err);
    if (err.message?.includes('audience')) {
      res.status(400).send('Invalid token audience');
    } else if (err.message?.includes('Token used too early')) {
      res.status(400).send('Token used too early');
    } else if (err.message?.includes('Token used too late')) {
      res.status(400).send('Token expired');
    } else {
      res.status(500).send('Internal server error');
    }
  }
};

export default { login, refresh, googleSignin };