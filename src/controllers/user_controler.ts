import { Request, Response } from 'express';
import userService from '../services/user_service';

const getUserProfile = async (req: Request, res: Response) => {
    try {
        const user = await userService.getUserById(req.body);
        res.status(200).send(user);
    } catch (err) {
        res.status(400).send(err);
    }
};

export default { getUserProfile };