import { MailerService } from '@nestjs-modules/mailer';
import {
  Body,
  Controller,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UsersManagmentService } from '../users-managment/users-managment.service';

import { JwtAuthGuard } from './guards/jwt.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RefreshTokenInterceptor } from './interceptors/refresh-token.interceptor';

import { UserValidationService } from './user-validation.service';
import { PasswordService } from './password.service';
import { RefreshTokenService } from './refresh-token.service';

@Controller('auth')
export class AuthController {
  private readonly logger: Logger = new Logger(AuthController.name);
  constructor(
    private readonly mailerService: MailerService,
    private readonly passwordService: PasswordService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly userValidationService: UserValidationService,
    private readonly usersManagmentService: UsersManagmentService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const jwt = await this.userValidationService.login(req.user!);
    const refresh = await this.refreshTokenService.issueRefreshToken(req.user!);
    res.cookie('access_token', jwt.access_token, {
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 60 * 15), // 16 minutes, token expires in 15
    });
    res.cookie('refresh_token', refresh.refresh_token, {
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
    });
    res.status(HttpStatus.OK);
    this.logger.log(`Successful login for user: ${req.user!.username}`);
    return {
      isLoggedIn: true,
      username: req.user!.username,
      role: req.user!.role,
    };
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(RefreshTokenInterceptor)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.refreshTokenService.revokeRefreshToken(res.locals.refresh_token.id);
    res.clearCookie('access_token', { httpOnly: true });
    res.clearCookie('refresh_token', { httpOnly: true });
    this.logger.log(`Logout successful for user ${req.user!.username}`);
    return { message: 'Logout successful.' };
  }

  @Post('refresh-token')
  @UseInterceptors(RefreshTokenInterceptor)
  async refreshToken(@Req() req: any, @Res({ passthrough: true }) res: any) {
    try {
      if (res.locals.refresh_token) {
        const dbUser = await this.usersManagmentService.findOne({
          accountId: res.locals.refresh_token.sub,
        });

        if (
          dbUser &&
          res.locals.refresh_token &&
          res.locals.refresh_token.id === dbUser?.refreshToken
        ) {
          // clear existing tokens
          res.clearCookie('access_token');
          res.clearCookie('refresh_token');

          // get new tokens
          const newAccessToken = await this.userValidationService.login({
            username: dbUser.username,
            role: dbUser.role,
          });
          const newRefreshToken = await this.refreshTokenService.issueRefreshToken({
            username: dbUser.username,
            role: dbUser.role,
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
              `User ${dbUser.username} logged in via refresh token.`,
            );
          } else {
            this.logger.log(
              `Routine refresh token check performed successfuly for ${dbUser.username}`,
            );
          }

          res.status(HttpStatus.OK);
          return {
            isLoggedIn: true,
            username: dbUser.username,
            role: dbUser.role,
          };
        } else {
          res.status(HttpStatus.UNAUTHORIZED);
          return { isLoggedIn: false, username: null, role: null };
        }
      } else {
        this.logger.debug(`Refresh check failed: no refresh token`);
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

  @Post('reset-password')
  async resetPassword(
    @Body('username') username: string,
    @Body('email') email: string,
  ) {
    const userEmail = await this.usersManagmentService.getUserEmail(username);
    if (userEmail?.email === email) {
      const newPassword = await this.passwordService.generatePassword();

      const _ = await this.usersManagmentService.changePassword(
        userEmail.accountId,
        newPassword,
      );

      const result = await this.mailerService.sendMail({
        to: email,
        from: 's196076@sggw.edu.pl',
        subject: `Request to reset your password - ${username}`,
        template: 'index',
        context: {
          code: newPassword,
          username: username,
        },
      });
    }
    return { message: 'Reset recieved' };
  }
}
