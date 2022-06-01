import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { UsersManagmentModule } from 'src/users-managment/users-managment.module';
import { ProfileController } from './profile.controller';

@Module({
  controllers: [ProfileController],
  imports: [
    AuthModule,
    UsersManagmentModule
  ]
})
export class ProfileModule {}
