import mongoose from 'mongoose';
import { ObjectId } from "mongodb";

interface IAddress {
    city: string;
    street: string;
    building: number;
}

interface IUser {
    _id?: ObjectId;
    name: string;
    email: string;
    password: string;
    profileImage?: string;
    addresses? : [IAddress];
    refreshToken?: String;
}

const addressSchema = new mongoose.Schema<IAddress>({
    city: { type: String, required: true },
    street: { type: String, required: true },
    building: { type: Number, required: true }
});

const userSchema = new mongoose.Schema<IUser>({
  name: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  addresses: { type: [addressSchema] , required: false },
  profileImage: { type: String },
  refreshToken: { type: String, required: false, unique: true, sparse: true }
});

const User = mongoose.model<IUser>('Users', userSchema);
export default User;