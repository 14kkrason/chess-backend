import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis/redis.module';
import { UsersManagmentModule } from './users-managment/users-managment.module';
import { ChessModule } from './chess/chess.module';
import { AuthModule } from './auth/auth.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { ProfileModule } from './profile/profile.module';
import { MailerModule } from '@nestjs-modules/mailer';

import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { LobbyModule } from './lobby/lobby.module';
import { MatchModule } from './match/match.module';
import { TimerModule } from './timer/timer.module';

@Module({
  imports: [
    RedisModule,
    UsersManagmentModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    ChessModule,
    AuthModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'test-client'),
      exclude: ['/api*'],
    }),
    LeaderboardModule,
    ProfileModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('EMAIL_HOST'),
          port: configService.get<number>('EMAIL_PORT'),
          secure: false, // true for 465, false for other ports
          auth: {
            user: configService.get<string>('EMAIL_ID'), // generated ethereal user
            pass: configService.get<string>('EMAIL_PASS'), // generated ethereal password
          },
        },
        defaults: {
          from: '"chess.app" <s196076@outlook.com>', // outgoing email ID
        },
        template: {
          dir: process.cwd() + "/dist/template/", 
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
    LobbyModule,
    MatchModule,
    TimerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
