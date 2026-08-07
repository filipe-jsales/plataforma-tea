import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from '../audit/audit.module';
import { ChallengesModule } from '../challenges/challenges.module';
import { EventsModule } from '../events/events.module';
import { SchoolsModule } from '../schools/schools.module';
import { SettingsModule } from '../settings/settings.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { MetricsAdminChallengeService } from './metrics-admin-challenge.service';
import { MetricsAdminExportService } from './metrics-admin-export.service';
import { MetricsAdminController } from './metrics-admin.controller';
import { MetricsAdminService } from './metrics-admin.service';
import { MetricsTeacherController } from './metrics-teacher.controller';
import { MetricsTeacherService } from './metrics-teacher.service';
import { MetricsService } from './metrics.service';

// MetricsService (6.1) é o motor único de status/progresso, consumido por
// qualquer painel de métrica futuro (professor, admin) — exportado pra
// outros módulos poderem injetá-lo sem duplicar a lógica. MetricsAdminService
// (6.2) é específico da visão institucional do admin, não usa o motor 6.1
// diretamente (não precisa de status por-desafio, só contagens
// agregadas). MetricsTeacherService (6.3/6.4) já usa o motor 6.1 (status por
// desafio por aluno da turma), por isso precisa de ChallengesModule (a
// sequência Use→Modify→Create) e SubjectsModule (todo tópico disponível).
// MetricsAdminChallengeService (6.5) também usa o motor 6.1, mais
// SettingsModule (limiar de amostra pequena) — o cálculo estatístico em si
// (statistics.ts) não tem dependência de módulo nenhuma, é código puro — ver
// docs/ai/backlog/metricas-professor-admin.md.
//
// MetricsAdminExportService (6.6) usa EventsService/SchoolsService/
// ChallengesService (já importados por este módulo) mais AuditModule (o
// registro "quem exportou o quê, quando" — módulo próprio, ver
// src/audit/) e ThrottlerModule (rate limit só na rota GET
// /metrics/admin/export, ver MetricsAdminController — `ThrottlerModule` é
// `@Global()`, então importar aqui já basta pra `ThrottlerGuard` resolver
// suas dependências em qualquer controller deste módulo, sem precisar
// tocar AppModule).
@Module({
  imports: [
    EventsModule,
    SchoolsModule,
    SubjectsModule,
    ChallengesModule,
    SettingsModule,
    AuditModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
  ],
  controllers: [MetricsAdminController, MetricsTeacherController],
  providers: [
    MetricsService,
    MetricsAdminService,
    MetricsTeacherService,
    MetricsAdminChallengeService,
    MetricsAdminExportService,
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
