import mongoose from 'mongoose';
import { ObjectId } from "mongodb";

interface IAddress {
    city: string;
    street: string;
    building: number;
}

export interface IUser {
    _id?: ObjectId;
    name: string;
    userName: string;
    email: string;
    password: string;
    profileImage?: string;
    addresses? : [IAddress];
    googleId? : string;
}

const addressSchema = new mongoose.Schema<IAddress>({
    city: { type: String, required: true },
    street: { type: String, required: true },
    building: { type: Number, required: true }
});

const userSchema = new mongoose.Schema<IUser>({
  name: { type: String, required: true },
  userName: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  addresses: { type: [addressSchema] , required: false },
  profileImage: { type: String },
  googleId: { type: String, required: false }
});

export const userMandatoryFields: (keyof IUser)[] = ['name', 'userName' , 'email', 'password'];
export const adressMandatoryFields: (keyof IAddress)[] = ['city', 'street', 'building'];

const User = mongoose.model<IUser>('Users', userSchema);
export default User;