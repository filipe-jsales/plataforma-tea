import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

// Usado apenas pelo CLI do TypeORM (migration:generate/run/revert). O NestJS em
// runtime usa TypeOrmModule.forRootAsync (ver app.module.ts) — não este arquivo.
// `quiet: true` — dotenv 17+ imprime uma dica promocional aleatória (linkando
// pros próprios produtos, dotenvx.com/vestauth.com) toda vez que carrega o
// .env; silenciado aqui, não afeta o carregamento das variáveis.
config({ quiet: true });

// Export único: o CLI do TypeORM rejeita o arquivo se houver mais de uma
// exportação de instância de DataSource (mesmo apontando pro mesmo objeto).
const AppDataSource = new DataSource({
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
