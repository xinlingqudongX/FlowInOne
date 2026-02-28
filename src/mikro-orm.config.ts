import { Options } from '@mikro-orm/core';
import { BetterSqliteDriver } from '@mikro-orm/better-sqlite';

const config: Options<BetterSqliteDriver> = {
  driver: BetterSqliteDriver,
  dbName: 'database.sqlite',
  debug: true,
  entities: ['./dist/**/*.entity.js', './src/**/*.entity.ts'],
  entitiesTs: ['./src/**/*.entity.ts'],
};

export default config;
