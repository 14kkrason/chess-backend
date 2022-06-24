import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersManagmentService } from '../users-managment/users-managment.service';
import { ValidatedUser } from './interfaces/validated-user.interface';

@Injectable()
export class UserValidationService {
  logger: Logger = new Logger(UserValidationService.name);
  
  constructor(
    private readonly userManagementService: UsersManagmentService,
    private readonly jwtService: JwtService
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.userManagementService.findOne({
      username: username,
    });
    if (!user) {
      this.logger.log(`User ${username} not found. Validation failed.`);
      return null;
    }
    const validate = await bcrypt.compare(password, user!.password);
    if (validate) {
      const result: ValidatedUser = {
        username: user.username,
        role: user.role,
      };
      this.logger.verbose(`User ${username} vaildated succesfuly.`);
      return result;
    }
    this.logger.log(
      `Password is not a match for user ${username}. Validation failed.`,
    );
    return null;
  }

  async login(user: ValidatedUser) {
    const dbUser = await this.userManagementService.findOne({
      username: user.username,
    });
    const payload = { username: user.username, role: user.role };
    return {
      access_token: this.jwtService.sign(payload, {
        subject: dbUser?.accountId,
      }),
    };
  }
}
