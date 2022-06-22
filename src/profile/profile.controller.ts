import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { AccessTokenInterceptor } from 'src/auth/access-token.interceptor';
import { AuthService } from 'src/auth/auth.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { UsersManagmentService } from 'src/users-managment/users-managment.service';

@Controller('profile')
export class ProfileController {
  logger: Logger = new Logger(ProfileController.name);
  constructor(
    private readonly usersManagmentService: UsersManagmentService,
    private readonly authService: AuthService,
  ) {}

  // TODO: add input validation of all of those things
  // TODO: add application logging where needed (ALL of the app)

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUserProfile(@Query('username') username: string) {
    try {
      if (username) {
        const profileData = await this.usersManagmentService.getUserProfileData(
          username,
        );
        return { results: profileData, message: 'Data returned succesfuly' };
      }
      return { results: null, message: 'No username provided.' };
    } catch (e) {
      this.logger.error(
        'Error occured while getting user profile data: ',
        e.message,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AccessTokenInterceptor)
  @Get('email')
  async getEmail(
    @Res({ passthrough: true }) response: Response,
    @Query('username') query: string,
  ) {
    const accountId = response.locals.access_token.sub;
    const result = await this.usersManagmentService.getUserEmail(query);
    if (accountId === result?.accountId) {
      return { result: result?.email, message: 'A-OK!' };
    }
    return {
      result: '',
      message: "Accounts ids dont match, can't return the email",
    };
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AccessTokenInterceptor)
  @Post('email')
  async changeUserEmail(
    @Body('email') email: string,
    @Body('pass') pass: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const validatedUser = await this.authService.validateUser(
      res.locals.access_token.username,
      pass,
    );
    const isEmailInUse =
      await this.usersManagmentService.checkIfMailAlreadyInUse(email);
    if (
      isEmailInUse.length === 0 &&
      validatedUser?.username === res.locals.access_token.username
    ) {
      const result = await this.usersManagmentService.updateEmail(
        res.locals.access_token.sub,
        email,
      );
      if (result) {
        return { message: 'Your email has been changed successfuly!' };
      }
      return {
        message: 'There has been an error when updating your email. Try again.',
      };
    }

    if (isEmailInUse) {
      return { message: 'Email already in use.' };
    }

    if (validatedUser === null) {
      return { message: 'Incorrect password.' };
    }
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AccessTokenInterceptor)
  @Post('username')
  async changeUsername(
    @Body('username') username: string,
    @Body('pass') pass: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const validatedUser = await this.authService.validateUser(
      res.locals.access_token.username,
      pass,
    );

    const isUsernameInUse =
      await this.usersManagmentService.checkIfUsernameAlreadyInUse(username);

    if (
      isUsernameInUse.length === 0 &&
      validatedUser?.username === res.locals.access_token.username
    ) {
      const result = await this.usersManagmentService.updateUsername(
        res.locals.access_token.sub,
        username,
      );
      console.log(result?.username);
      return { message: 'Username updated successfuly!' };
    }

    if (isUsernameInUse.length > 0) {
      return { message: 'Username already in use.' };
    }

    if (validatedUser === null) {
      return { message: 'Incorrect password.' };
    }
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AccessTokenInterceptor)
  @Post('password')
  async changePassword(
    @Body('newPassword') newPass: string,
    @Body('pass') pass: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const validatedUser = await this.authService.validateUser(
      res.locals.access_token.username,
      pass,
    );

    if (validatedUser) {
      const _ = await this.usersManagmentService.changePassword(
        res.locals.access_token.sub,
        newPass,
      );
      return {
        message: 'Password change finished successfuly!',
        status: 'done',
      };
    }

    return {
      message: 'Password change failed. Incorrect password.',
      status: 'failed',
    };
  }

  @Post('create')
  async createProfile(
    @Body('username') username: string,
    @Body('password') password: string,
    @Body('email') email: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log(username, password, email);
    const result = await this.usersManagmentService.create({
      username: username,
      email: email,
      password: password,
    });
    return result;
  }
}
