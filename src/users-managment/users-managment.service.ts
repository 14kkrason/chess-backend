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
  // db.users.find({ $or: [{ username: { $eq: 'krasokr2' }  }, { email: { $eq: 'k.krason6@wp.pl' } }]}, { username: { $eq: [ '$username', 'krasokr2' ] }, email: { $eq: [ '$email', 'k.krason6@wp.pl' ] } })
  async create(createUserDto: CreateUserDto): Promise<{ user: string | null, errors: string[]  }> {
    const { username, email, password } = createUserDto;
    let errors: string[] = [];

    const users = await this.userModel.find(
      {
        $or: [{ username: { $eq: username } }, { email: { $eq: email } }],
      },
      { username: 1, email: 1 },
    );

    if (users.length > 0) {
      
      users.forEach((user) => {
        if (user.email == email) {
          errors.push('Email already taken. 📧');
        }

        if (user.username === username) {
          errors.push('Username already taken. ❌');
        }
      });
      return { user: null, errors: errors} ;
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
    await newUser.save()
    return { user: username , errors: errors };
  }

  async changePassword(accountId: string, pass: string) {
    const user = await this.userModel.findOne({
      accountId: accountId,
    });

    if (user) {
      const hash = await bcrypt.hash(pass, 12);
      user.password = hash;
      this.logger.log(`Password changed for user ${user.username}`);
      return user.save();
    }
    this.logger.log(`Password change failed.`);
    return null;
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findOne(
    user: Partial<User>,
  ): Promise<Query<User, UserDocument> | null> {
    return this.userModel.findOne({ ...user }).exec();
  }

  async updateRefreshToken(user: Partial<User>, token: string): Promise<any> {
    return this.userModel
      .updateOne({ ...user }, { $set: { refreshToken: token } })
      .exec();
  }

  async addNewGame(user: Partial<User>, id: string) {
    return this.userModel
      .updateOne({ ...user }, { $push: { games: id } })
      .exec();
  }

  async updateElo(
    user: Partial<User>,
    type: string,
    elo: number,
    date: number,
  ): Promise<any> {
    let update;
    switch (type) {
      case 'bullet':
        update = {
          $set: { eloBullet: elo },
          $push: { eloProgressionBullet: { elo: elo, date: date } },
        };
        break;
      case 'blitz':
        update = {
          $set: { eloBlitz: elo },
          $push: { eloProgressionBlitz: { elo: elo, date: date } },
        };
        break;
      case 'rapid':
        update = {
          $set: { eloRapid: elo },
          $push: { eloProgressionRapid: { elo: elo, date: date } },
        };
        break;
    }
    return this.userModel.updateOne({ ...user }, update);
  }

  // db.users.find({  }, { username: 1, eloRapid: 1 }).sort({ eloRapid: -1 }).skip(0).limit(0)
  // ^^^ this is the mongodb query
  async getSortedByElo(skip: number, limit: number, formats: string[]) {
    let data = formats.map(async (format) => {
      switch (format) {
        case 'bullet':
          let bullet = await this.userModel
            .find({}, { username: 1, eloBullet: 1 })
            .sort({ eloBullet: -1 })
            .skip(skip)
            .limit(limit)
            .exec();

          return { bullet: [...bullet] };
        case 'blitz':
          let blitz = await this.userModel
            .find({}, { username: 1, eloBlitz: 1 })
            .sort({ eloBlitz: -1 })
            .skip(skip)
            .limit(limit)
            .exec();

          return { blitz: [...blitz] };
        case 'rapid':
          let rapid = await this.userModel
            .find({}, { username: 1, eloRapid: 1 })
            .sort({ eloRapid: -1 })
            .skip(skip)
            .limit(limit)
            .exec();

          return { rapid: [...rapid] };

        default:
          throw new Error(`Invalid game format ${format}`);
      }
    });

    return (await Promise.all(data)).reduce((prev, next) => {
      return { ...prev, ...next };
    }, {});
  }

  // db.users.find({ username: { $regex: "^k.", $options: "i" } }, { username: 1 })
  async getUserSearchResults(username: string) {
    const regex = `^${username}.`;
    return this.userModel
      .find({ username: { $regex: regex, $options: 'i' } }, { username: 1 })
      .exec();
  }

  async getUserProfileData(username: string) {
    // TODO:
    // db.users.findOne({ username: 'krasokr2' }, { games: { $slice: [ -1000 ] }, gamesNumber: { $size: "$games" } })
    // ^^^ that's how we get game limits, set this. We should probably be getting like a 1000 game ids and the number of them all
    // when the current processed number in frontend is bigger we query for another thousand or remainder if it's less
    // we will go to chess module for game data for virtual scroll
    return this.userModel.findOne(
      { username: username },
      {
        username: 1,
        gamesNumber: { $size: '$games' },
        bulletNumber: { $size: '$eloProgressionBullet' },
        blitzNumber: { $size: '$eloProgressionBlitz' },
        rapidNumber: { $size: '$eloProgressionRapid' },
        eloRapid: 1,
        eloBlitz: 1,
        eloBullet: 1,
        eloProgressionBullet: { $slice: -5000 },
        eloProgressionBlitz: { $slice: -5000 },
        eloProgressionRapid: { $slice: -5000 },
      },
    );
  }

  async checkIfUsernameAlreadyInUse(username: string) {
    return this.userModel.find({
      username: { $exists: true, $eq: username },
    });
  }

  async updateUsername(accountId: string, username: string) {
    return this.userModel.findOneAndUpdate(
      { accountId: accountId },
      { $set: { username: username } },
      { new: true },
    );
  }

  async checkIfMailAlreadyInUse(email: string) {
    return this.userModel.find({
      email: { $exists: true, $eq: email },
    });
  }

  async updateEmail(accountId: string, email: string) {
    return this.userModel.findOneAndUpdate(
      { accountId: accountId },
      { $set: { email: email } },
      { new: true },
    );
  }

  async getUserEmail(username: string) {
    return this.userModel.findOne(
      { username: username },
      { email: 1, accountId: 1 },
    );
  }

  async getGameIds(username: string, limit: number, skip: number) {
    return this.userModel
      .findOne({ username: username })
      .where('games')
      .slice([skip, limit])
      .exec();
  }
}
