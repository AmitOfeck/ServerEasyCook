import { Request, Response } from 'express';
import userService from '../services/user_service';

/*type tTokens = {
    accessToken: string;
    refreshToken: string;
}

const generateToken = (_id: string): tTokens | null => {
    if (!process.env.TOKEN_SECRET) {
        return null;
    }
    // generate token
    const random = Math.random().toString();
    const accessToken = jwt.sign({
        _id: _id,
        random: random
    },
        process.env.TOKEN_SECRET,
        { expiresIn: process.env.TOKEN_EXPIRES });

    const refreshToken = jwt.sign({
        _id: _id,
        random: random
    },
        process.env.TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES });
    return {
        accessToken: accessToken,
        refreshToken: refreshToken
    };
};

const login = async (req: Request, res: Response) => {
    try {
        const user = await userService.findDUserByField("username", req.body.username);
        if (!user) {
            res.status(400).send('Wrong username or password');
            return;
        }
        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) {
            res.status(400).send('Wrong username or password');
            return;
        }
        if (!process.env.TOKEN_SECRET) {
            res.status(500).send('Server Error');
            return;
        }
        // generate token
        const tokens = generateToken(user._id!);
        if (!tokens) {
            res.status(500).send('Server Error');
            return;
        }

        user.refreshToken = tokens.refreshToken;
        await user.save();

        res.status(200).send(
            {
                userId: user._id,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            });
    } catch (err) {
        res.status(400).send(err);
    }
};

type tUser = Document<unknown, {}, IUser> & IUser & Required<{
    username: string;
}> & {
    __v: number;
}

const verifyRefreshToken = (refreshToken: string | undefined) => {
    return new Promise<tUser>((resolve, reject) => {
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
                const user = await userService.getUser(_id);
                if (!user) {
                    reject("fail");
                    return;
                }
                if (user.refreshToken !== refreshToken) {
                    user.refreshToken = ''; 
                    await user.save();
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

const logout = async (req: Request, res: Response) => {
    try {
        const user = await verifyRefreshToken(req.body.refreshToken);
        user.refreshToken = ''; // Clear refresh token upon logout
        await user.save();
        res.status(200).send("Success");
    } catch (err) {
        res.status(400).send("Fail");
    }
};

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
        user.refreshToken = tokens.refreshToken; // Save the new refresh token
        await user.save();

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

const client = new OAuth2Client();

const googleSignin = async (req: Request, res: Response): Promise<void> => {
    const credential = req.body.credential;

    if (!credential) {
        res.status(400).json({ error: "Missing credential in request body" });
        return;
    }

    try {
        const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            res.status(400).json({ error: "Invalid token payload or missing email" });
            return;
        }

        const email = payload.email;
        const user = await userService.findDUserByField("email", email);

        if (!user) {
            res.status(404).json({ error: "User dos not exist" });
            return;
        }
    
        const tokens = await generateToken(user._id);

        if (!tokens) {
            res.status(500).send('Server Error');
            return;
        }

        user.refreshToken = tokens.refreshToken;
        await user.save();

        res.status(200).send(
        {
            userId: user._id,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        });
    } catch (error) {
      console.error("Error during Google Sign-In:", error);
      res.status(400).json({ error: "Authentication failed" });
      return;
    
    }
};*/

export default {
};
