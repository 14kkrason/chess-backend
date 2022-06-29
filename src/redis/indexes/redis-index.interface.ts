import { CreateSchema } from "@node-redis/search/dist/commands";

// HACK: type of CreateOptions cannot be imported
// so I imported it from files to the file in question
// maybe in next version it is fixed?
interface CreateOptions {
  ON?: 'HASH' | 'JSON';
  PREFIX?: string | Array<string>;
  FILTER?: string;
  SCORE?: number;
  MAXTEXTFIELDS?: true;
  TEMPORARY?: number;
  NOOFFSETS?: true;
  NOHL?: true;
  NOFIELDS?: true;
  NOFREQS?: true;
  SKIPINITIALSCAN?: true;
  STOPWORDS?: string | Array<string>;
}

export interface RedisIndex {
  name: string;
  schema: CreateSchema;
  options: CreateOptions;
}