import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { ValidatedUser } from '../interfaces/validated-user.interface';
import { UserValidationService } from '../user-validation.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private userValidationService: UserValidationService) {
    super();
  }

  async validate(username: string, password: string): Promise<ValidatedUser> {
    const user = await this.userValidationService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}