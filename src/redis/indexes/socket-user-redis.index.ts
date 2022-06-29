import { SchemaFieldTypes } from 'redis';
import { RedisIndex } from './redis-index.interface';

export class SocketUserRedisIndex implements RedisIndex {
  name = 'idx:socketUser';
  schema = {
    login: SchemaFieldTypes.TEXT,
    userId: SchemaFieldTypes.TEXT,
    socketId: SchemaFieldTypes.TEXT,
  };
  options = {
    ON: 'HASH' as 'HASH', 
    PREFIX: 'chess:socketUser',
  }
}
