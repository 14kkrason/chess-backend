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
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { CreateUserDto } from '../users-managment/dtos/createUser.dto';
import { UsersManagmentService } from '../users-managment/users-managment.service';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtInterceptor } from './jwt.interceptor';

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
      expires: new Date(Date.now() + 1000 * 60 * 15), // 16 minutes, token expires in 15
    });
    res.cookie('refresh_token', refresh.refresh_token, {
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
    });
    res.status(HttpStatus.OK);
    this.logger.log(`Successful login for user: ${req.user.username}`);
    return {
      isLoggedIn: true,
      username: req.user.username,
      role: req.user.role,
    };
  }

  // TODO: this stuff with parsing tokens is not very DRY, maybe some interceptors could take care of this stuff?
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(JwtInterceptor)
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    await this.authService.revokeRefreshToken(res.locals.refresh_token.username);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return { message: 'Logout successful.' }
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

  @Post('refresh-token')
  @UseInterceptors(JwtInterceptor)
  async refreshToken(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    try {
      if (req.headers.cookie) {
        const refreshTokenId =
          await this.usersManagmentService.getRefreshTokenId(
            res.locals.refresh_token.username,
          );
        if (
          res.locals.refresh_token &&
          res.locals.refresh_token.id === refreshTokenId.refreshToken
        ) {
          // clear existing tokens
          res.clearCookie('access_token');
          res.clearCookie('refresh_token');

          // get new tokens
          const newAccessToken = await this.authService.login({
            username: res.locals.refresh_token.username,
            role: res.locals.refresh_token.role,
          });
          const newRefreshToken = await this.authService.issueRefreshToken({
            username: res.locals.refresh_token.username,
            role: res.locals.refresh_token.role,
          });

          // set cookies
          res.cookie('access_token', newAccessToken.access_token, {
            httpOnly: true,
            expires: new Date(Date.now() + 1000 * 60 * 15), // 16 minutes, token expires in 15
          });
          res.cookie('refresh_token', newRefreshToken.refresh_token, {
            httpOnly: true,
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
          });

          if (req.body.loginAttempt) {
            this.logger.log(
              `User ${res.locals.refresh_token.username} logged in via refresh token.`,
            );
          } else {
            this.logger.log(
              `Routine refresh token check performed successfuly for ${res.locals.refresh_token.username}`,
            );
          }

          res.status(HttpStatus.OK);
          return {
            isLoggedIn: true,
            username: res.locals.refresh_token.username,
            role: res.locals.refresh_token.role,
          };
        }
      } else {
        this.logger.debug(`Refresh check failed: no cookies`);
        res.status(HttpStatus.UNAUTHORIZED);
        return { isLoggedIn: false, username: null, role: null };
      }
    } catch (e) {
      res.status(HttpStatus.UNAUTHORIZED);
      if (e.message === 'jwt must be provided') {
        this.logger.debug('Refresh check failed: no token provided');
      } else {
        this.logger.error(`Error while refreshing token: ${e}`);
      }
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('data')
  async userData() {
    return { message: "This is some data"}
  }
}
