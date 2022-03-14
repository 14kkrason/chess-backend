import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Date, Document } from 'mongoose';

@Schema()
export class User {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  accountId: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: null })
  fideTitle: string;

  @Prop({ required: true })
  registrationDate: number;

  @Prop({ required: true, default: 800 })
  elo: number;

  @Prop({required: true, default: 'user'})
  role: string;

  @Prop({ default: [] })
  games: string[];

  @Prop()
  description: string;

  @Prop()
  avatar: string;

  @Prop()
  nationality: string;

  @Prop()
  refreshToken: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
export type UserDocument = User & Document;