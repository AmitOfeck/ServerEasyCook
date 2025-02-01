import UserModel from '../models/user_model';
import { IUser } from '../models/user_model';
import bcrypt from 'bcrypt';
import { upload } from '../utils/files';

class UserService {

  async createUser(userData: IUser, file: any) {
    const password = userData.password;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    userData.password = hashedPassword;
    
    const user = new UserModel( userData );
    
    if(file) {
        upload.single(file);
        const imageUrl = `/uploads/${file.filename}`;
        userData.profileImage = imageUrl;
    }

    return user.save();
  }

  async getUser(userId: string) {
    return UserModel.findById(userId);
  }

}

export default new UserService();