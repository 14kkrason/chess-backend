import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Query } from 'mongoose';
import { CreateUserDto } from './dtos/createUser.dto';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

@Injectable()
export class UsersManagmentService {
  private readonly logger = new Logger(UsersManagmentService.name);
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<User | null> {
    const { username, email, password } = createUserDto;
    const user = await this.userModel.findOne({
      username: username,
    });
    if (user) {
      this.logger.warn(`Login ${username} is taken, skipping creation.`);
      return null;
    }

    const hash = await bcrypt.hash(password, 12);
    const newUser = new this.userModel({
      username: username,
      email: email,
      accountId: uuid(),
      password: hash,
      registrationDate: Date.now(),
    });
    this.logger.debug(`User ${username} created.`);
    return newUser.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findOne(user: Partial<User>): Promise<Query<User, UserDocument> | null> {
    return this.userModel.findOne({ ...user}).exec();
  }

  async updateRefreshToken(user: Partial<User>, token: string): Promise<any> {
    return this.userModel
      .updateOne({ ...user }, { $set: { refreshToken: token } })
      .exec();
  }

  async addNewGame(user: Partial<User>, id: string) {
    return this.userModel
      .updateOne({ ...user}, { $push: { games: id } })
      .exec();
  }
}
