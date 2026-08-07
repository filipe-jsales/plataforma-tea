import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BlocksModule } from './blocks/blocks.module';
import { ChallengesModule } from './challenges/challenges.module';
import { ChallengeTemplatesModule } from './challenge-templates/challenge-templates.module';
import { ChallengeAllocationsModule } from './challenge-allocations/challenge-allocations.module';
import { EventsModule } from './events/events.module';
import { HomeModule } from './home/home.module';
import { IdentityModule } from './identity/identity.module';
import { IllustrationsModule } from './illustrations/illustrations.module';
import { MetricsModule } from './metrics/metrics.module';
import { SchoolsModule } from './schools/schools.module';
import { SettingsModule } from './settings/settings.module';
import { SubjectsModule } from './subjects/subjects.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        autoLoadEntities: true,
        // Schema é controlado por migrations (ver src/database/), nunca por sync
        // automático — mesmo em desenvolvimento, para o schema real de tabelas
        // ficar sempre rastreável e revisável em código.
        synchronize: false,
      }),
    }),
    UsersModule,
    IdentityModule,
    IllustrationsModule,
    SubjectsModule,
    SchoolsModule,
    BlocksModule,
    ChallengesModule,
    ChallengeTemplatesModule,
    ChallengeAllocationsModule,
    EventsModule,
    AuthModule,
    HomeModule,
    SettingsModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
