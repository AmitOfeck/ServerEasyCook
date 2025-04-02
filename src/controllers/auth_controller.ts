import { Request, Response } from 'express';
import userService from '../services/user_service';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { IUser } from '../models/user_model';
import { OAuth2Client } from 'google-auth-library';

type tTokens = {
    accessToken: string;
    refreshToken: string;
}
const generateToken = (_id: mongoose.mongo.BSON.ObjectId): tTokens | null => {
    if (!process.env.TOKEN_SECRET || !process.env.TOKEN_EXPIRES || !process.env.REFRESH_TOKEN_EXPIRES) {
        return null;
    }
    // generate token
    const accessToken = jwt.sign({_id},
        process.env.TOKEN_SECRET,
        { expiresIn: '1h' });

    const refreshToken = jwt.sign({_id},
        process.env.TOKEN_SECRET,
        { expiresIn: '1h' });
    return {
        accessToken: accessToken,
        refreshToken: refreshToken
    };
};

const login = async (req: Request, res: Response) => {
    try {
        const user = (await userService.getUserByEmail(req.body.email))[0];
        if (!user) {
            res.status(400).send('Wrong email or password');
            return;
        }
        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) {
            res.status(400).send('Wrong email or password');
            return;
        }
        
        if (!process.env.TOKEN_SECRET) {
            res.status(500).send('Server Error');
            return;
        }
        // generate token
        const tokens = generateToken(user._id!);
        console.log(tokens, "------------")
        if (!tokens) {
            res.status(500).send('Server Error');
            return;
        }

        res.status(200).send(
            {
                userId: user._id,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            });
    } catch (err) {
        res.status(500).send(err);
    }
};

const verifyRefreshToken = (refreshToken: string | undefined) => {
    return new Promise<IUser>((resolve, reject) => {
        // Get refresh token from body
        if (!refreshToken) {
            reject("fail");
            return;
        }
        // Verify token
        if (!process.env.TOKEN_SECRET) {
            reject("fail");
            return;
        }
        jwt.verify(refreshToken, process.env.TOKEN_SECRET, async (err: any, payload: any) => {
            if (err) {
                reject("fail");
                return;
            }
            // Get the username from token
            const _id = payload._id;
            try {
                // Get the user from the DB
                const user = await userService.getUserById(_id);
                if (!user) {
                    reject("fail");
                    return;
                }
                resolve(user);
            } catch (err) {
                reject("fail");
                return;
            }
        });
    });
}

const refresh = async (req: Request, res: Response) => {
    try {
        const user = await verifyRefreshToken(req.body.refreshToken);
        if (!user) {
            res.status(400).send("Fail");
            return;
        }
        const tokens = generateToken(user._id!);

        if (!tokens) {
            res.status(500).send('Server Error');
            return;
        }

        res.status(200).send(
            {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                _id: user._id
            });
    } catch (err) {
        res.status(400).send("Fail");
    }
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
          userName: payload?.email?.split('@')[0] || '',
          profileImage: payload?.picture || '',
          password: 'google-signin',
          googleId,
          favoriteDishes: []
      });
    }

    const tokens = await generateToken(user._id!);
    res.status(200).send({_id: user._id,...tokens});
  } catch (err) {
    res.status(500).send(err);
  }
};

export default {
    login,
    refresh,
    googleSignin
};
