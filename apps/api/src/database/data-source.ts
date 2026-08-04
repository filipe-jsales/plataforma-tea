import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

// Usado apenas pelo CLI do TypeORM (migration:generate/run/revert). O NestJS em
// runtime usa TypeOrmModule.forRootAsync (ver app.module.ts) — não este arquivo.
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});

export default AppDataSource;
