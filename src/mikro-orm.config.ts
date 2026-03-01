import { Options } from '@mikro-orm/core';
import { SqliteDriver } from '@mikro-orm/sqlite';

const config: Options<SqliteDriver> = {
  driver: SqliteDriver,
  dbName: 'database.sqlite',
  debug: true,
  entities: ['./dist/**/*.entity.js', './src/**/*.entity.ts'],
  entitiesTs: ['./src/**/*.entity.ts'],
};

export default config;