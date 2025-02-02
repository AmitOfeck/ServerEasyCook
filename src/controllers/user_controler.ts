import { Request, Response } from 'express';
import userService from '../services/user_service';

const getUserProfile = async (req: Request, res: Response) => {
    try {
        const user = await userService.getUserById(req.params.id);
        res.status(200).send(user);
    } catch (err) {
        res.status(400).send(err);
    }
};

const register = async (req: Request, res: Response) => {
    try {
        req.body.addresses = JSON.parse(req.body.addresses); 
        req.body.profileImage = req.file?.filename;
        const user = await userService.createUser(req.body);
        res.status(200).send(user);
    } catch (err) {
        console.log(err);
        res.status(400).send(err);
    }
};

export default { getUserProfile, register};