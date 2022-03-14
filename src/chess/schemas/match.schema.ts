import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Match {
  @Prop({required: true})
  gameId: string;

  @Prop({required: true})
  date: number;

  @Prop({required: true})
  white: string;

  @Prop({required: true})
  black: string;

  @Prop({required: true, default: true})
  ongoing: boolean;
  
  @Prop()
  result: string;

  @Prop()
  pgn: string;

  @Prop()
  fen: string;
}

export const MatchSchema = SchemaFactory.createForClass(Match);
export type MatchDocument = Match & Document;