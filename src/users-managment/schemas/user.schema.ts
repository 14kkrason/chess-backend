import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';


interface progression {
  elo: number,
  date: number
}

interface game {
  id: string
}

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
  eloRapid: number;

  @Prop({ required: true, default: 800 })
  eloBlitz: number;

  @Prop({ required: true, default: 800 })
  eloBullet: number;

  @Prop({ required: true, default: [{ elo: 800, date: Date.now() }] })
  eloProgressionRapid: progression[]

  @Prop({ required: true, default: [{ elo: 800, date: Date.now() }] })
  eloProgressionBlitz: progression[]

  @Prop({ required: true, default: [{ elo: 800, date: Date.now() }] })
  eloProgressionBullet: progression[]

  @Prop({required: true, default: 'user'})
  role: string;

  @Prop({ default: [] })
  games: game[];

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