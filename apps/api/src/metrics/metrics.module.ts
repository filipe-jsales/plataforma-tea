import { Module } from '@nestjs/common';
import { ChallengesModule } from '../challenges/challenges.module';
import { EventsModule } from '../events/events.module';
import { SchoolsModule } from '../schools/schools.module';
import { SubjectsModule } from '../subjects/subjects.module';
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
// sequência Use→Modify→Create) e SubjectsModule (todo tópico disponível) —
// ver docs/ai/backlog/metricas-professor-admin.md.
@Module({
  imports: [EventsModule, SchoolsModule, SubjectsModule, ChallengesModule],
  controllers: [MetricsAdminController, MetricsTeacherController],
  providers: [MetricsService, MetricsAdminService, MetricsTeacherService],
  exports: [MetricsService],
})
export class MetricsModule {}
