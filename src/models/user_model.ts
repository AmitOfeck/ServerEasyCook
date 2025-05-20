import mongoose from 'mongoose';
import { ObjectId } from "mongodb";
import { FieldValidators } from '../utils/validations';

export interface IAddress {
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
    favoriteDishes: mongoose.Types.ObjectId[];
}

export const addressSchema = new mongoose.Schema<IAddress>({
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
  googleId: { type: String, required: false },
  favoriteDishes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Dish", default: [] }]
});

export const userMandatoryFields: (keyof IUser)[] = ['name', 'userName' , 'email', 'password'];
export const adressMandatoryFields: (keyof IAddress)[] = ['city', 'street', 'building'];

export const userValidators: FieldValidators<IUser> = {
    email: (value) => typeof value === 'string' && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value),
    name: (value) => typeof value === 'string' && value.trim().length > 0 && /^[a-zA-Z\s]+$/.test(value)
};

export const addressValidators: FieldValidators<IAddress> = {
    city: (value) => typeof value === 'string' && value.trim().length > 0 && /^[a-zA-Z\s]+$/.test(value) ,
    street: (value) => typeof value === 'string'&& value.trim().length > 0 && /^[a-zA-Z\s]+$/.test(value) ,
    building: (value) => typeof value === 'number' && Number.isInteger(value) && value > 0 
};

const User = mongoose.model<IUser>('Users', userSchema);
export default User;