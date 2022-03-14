import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { CreateUserDto } from '../users-managment/dtos/createUser.dto';
import { UsersManagmentService } from '../users-managment/users-managment.service';

import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  private readonly logger: Logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly usersManagmentService: UsersManagmentService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const jwt = await this.authService.login(req.user);
    const refresh = await this.authService.issueRefreshToken(req.user);
    res.cookie('access_token', jwt.access_token, {
      httpOnly: true,
      domain: 'localhost',
      expires: new Date(Date.now() + 1000 * 60 * 15), // 16 minutes, token expires in 15
    });
    res.cookie('refresh_token', refresh.refresh_token, {
      httpOnly: true,
      domain: 'localhost',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
    });
    res.status(HttpStatus.OK);
    this.logger.log(`Successful login for user: ${req.user.username}`)
    return { message: 'User logged in successfuly.' };
  }

  @Post('refresh-token')
  async refreshToken(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const refreshTokenCookie =
        await this.authService.returnRefreshTokenFromCookie(
          req.headers.cookie!,
        );
      const parsedRefreshToken = await this.authService.verifyRefreshToken(
        refreshTokenCookie,
      );
      const refreshTokenId = await this.usersManagmentService.getRefreshTokenId(
        parsedRefreshToken.username,
      );
      if (
        parsedRefreshToken &&
        parsedRefreshToken.id === refreshTokenId.refreshToken
      ) {
        // clear existing tokens
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');

        // get new tokens
        const newAccessToken = await this.authService.login({
          username: parsedRefreshToken.username,
          role: parsedRefreshToken.role,
        });
        const newRefreshToken = await this.authService.issueRefreshToken({
          username: parsedRefreshToken.username,
          role: parsedRefreshToken.role,
        });

        // set cookies
        res.cookie('access_token', newAccessToken.access_token, {
          httpOnly: true,
          domain: 'localhost',
          expires: new Date(Date.now() + 1000 * 60 * 15), // 16 minutes, token expires in 15
        });
        res.cookie('refresh_token', newRefreshToken.refresh_token, {
          httpOnly: true,
          domain: 'localhost',
          expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
        });

        if (req.body.login) {
          this.logger.log(
            `User ${parsedRefreshToken.username} logged in via refresh token.`,
          );
        } else {
          this.logger.log(
            `Routine refresh token check performed successfuly for ${parsedRefreshToken.username}`,
          );
        }
      }
    } catch (e) {
      res.status(HttpStatus.UNAUTHORIZED);
      if(e.message === 'jwt must be provided') {
        this.logger.debug('Refresh check failed: no token provided')
      }
      else{
        this.logger.error(`Error while refreshing token: ${e.message}`);
      }
    }
  }

  @Post('register')
  async handleUserRegistration(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.usersManagmentService.create(createUserDto);
    if (user) {
      return user.username;
    }
    res.status(HttpStatus.BAD_REQUEST);
    return "Can't add user, login is already taken.";
  }
}
