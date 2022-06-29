import { SchemaFieldTypes } from 'redis';
import { RedisIndex } from './redis-index.interface';

export class MatchRedisIndex implements RedisIndex {
  name = 'idx:match';
  schema = {
    gameId: SchemaFieldTypes.TEXT,
    gameType: SchemaFieldTypes.TEXT,
    whiteId: SchemaFieldTypes.TEXT,
    blackId: SchemaFieldTypes.TEXT,
    white: SchemaFieldTypes.TEXT,
    black: SchemaFieldTypes.TEXT,
    whiteReady: SchemaFieldTypes.NUMERIC,
    blackReady: SchemaFieldTypes.NUMERIC,
  };
  options = {
    ON: 'HASH' as 'HASH',
    PREFIX: 'chess:match',
  };
}
