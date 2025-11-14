import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'guessly',
    entities: [join(__dirname, '..', 'database', 'entities', '*.entity{.ts,.js}')],
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
    autoLoadEntities: true,
    migrations: [join(__dirname, '..', 'database', 'migrations', '*{.ts,.js}')],
    migrationsTableName: 'migrations',
  }),
);
