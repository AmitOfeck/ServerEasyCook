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
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload?.email;
    const googleId = payload?.sub;

    let user = (await userService.getUserByEmail(email!))[0];
    if (!user) {
      user = await userService.createUser({
        email: email!,
        name: payload?.name || '',
        userName: email!.split('@')[0] || '',
        profileImage: payload?.picture || '',
        password: 'google-signin',
        googleId,
        favoriteDishes: [],
        madeDishes: [],
      });
    }

    const tokens = generateToken(user._id!);
    if (!tokens) { res.status(500).send('Server Error'); return; }

    res.status(200).send({
      userId: user._id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) { res.status(500).send(err); }
};

export default { login, refresh, googleSignin };