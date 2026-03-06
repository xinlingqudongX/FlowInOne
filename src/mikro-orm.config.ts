import { SqliteDriver, defineConfig } from '@mikro-orm/sqlite';
import { ProjectEntity } from './project/entities/project.entity';
import { ProjectAsset } from './project/entities/project-asset.entity';

export default defineConfig({
  allowGlobalContext: true,
  driver: SqliteDriver,
  dbName: 'database.sqlite',
  entities: [ProjectEntity,ProjectAsset],
  dynamicImportProvider: (id) => require(id),
  migrations:{
    transactional: true,
    snapshot: false,
  },
  schemaGenerator: {
    disableForeignKeys: true,
    createForeignKeyConstraints: false,
  }
})