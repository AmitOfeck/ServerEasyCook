import UserModel from '../models/user_model';
import { IUser } from '../models/user_model';
import bcrypt from 'bcrypt';

class UserService {

  async createUser(userData: IUser) {
    const password = userData.password;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    userData.password = hashedPassword;
    
    const user = new UserModel( userData );
    
    if(userData.profileImage) {
      const imageUrl = `/uploads/${userData.profileImage}`;
        userData.profileImage = imageUrl;
    }

    return user.save();
  }

  async getUserById(userId: string) {
    return UserModel.findById(userId);
  }

  async getUserByEmail(userEmail: string) : Promise<IUser[]> {
    return UserModel.find({ email: userEmail });
  }

}

export default new UserService();