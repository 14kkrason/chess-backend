import { SchemaFieldTypes } from 'redis';
import { RedisIndex } from './redis-index.interface';

export class LobbyRedisIndex implements RedisIndex {
  name = 'idx:lobby';
  schema = {
    gameId: SchemaFieldTypes.TEXT,
    gameType: SchemaFieldTypes.TEXT,
    creationTime: SchemaFieldTypes.NUMERIC,
    playerName: SchemaFieldTypes.TEXT,
    playerElo: SchemaFieldTypes.NUMERIC,
  };
  options = {
    ON: 'HASH' as 'HASH',
    PREFIX: 'chess:lobby',
  };
}
