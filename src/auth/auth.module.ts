import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersManagmentModule } from 'src/users-managment/users-managment.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { LocalAuthGuard } from './guards/local-auth.guard';

import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtAuthGuard } from './guards/jwt.guard';
import { WsGuard } from './guards/ws.guard';
import { RefreshTokenInterceptor } from './interceptors/refresh-token.interceptor';
import { AccessTokenInterceptor } from './interceptors/access-token.interceptor';
import { RedisModule } from 'src/redis/redis.module';
import { UserValidationService } from './user-validation.service';
import { PasswordService } from './password.service';

@Module({
  imports: [
    UsersManagmentModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '60m',
          issuer: 'chess.app',
          audience: 'chess.app',
        },
      }),
    }),
    RedisModule,
  ],
  providers: [
    AuthService,
    LocalStrategy,
    LocalAuthGuard,
    JwtStrategy,
    JwtAuthGuard,
    WsGuard,
    RefreshTokenInterceptor,
    AccessTokenInterceptor,
    UserValidationService,
    PasswordService
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    LocalAuthGuard,
    JwtAuthGuard,
    WsGuard,
    RefreshTokenInterceptor,
    AccessTokenInterceptor,
    UserValidationService
  ],
})
export class AuthModule {}
