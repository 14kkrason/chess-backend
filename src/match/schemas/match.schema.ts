import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Match {
  @Prop({required: true})
  gameId: string;

  @Prop({required: true})
  type: string;

  @Prop({required: true})
  date: number;

  @Prop({required: true})
  whiteId: string;

  @Prop({required: true})
  blackId: string;

  @Prop({required: true})
  white: string;

  @Prop({required: true})
  black: string

  @Prop({required: true, default: true})
  ongoing: boolean;
  
  @Prop()
  result: string;

  @Prop({required: true, default: ''})
  pgn: string;

  @Prop({required: true, default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'})
  fen: string;

  @Prop()
  blackElo: number;

  @Prop()
  blackEloChange: number;

  @Prop()
  whiteElo: number;

  @Prop()
  whiteEloChange: number;
}

export const MatchSchema = SchemaFactory.createForClass(Match);
export type MatchDocument = Match & Document;