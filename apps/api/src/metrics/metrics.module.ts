import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { SchoolsModule } from '../schools/schools.module';
import { MetricsAdminController } from './metrics-admin.controller';
import { MetricsAdminService } from './metrics-admin.service';
import { MetricsService } from './metrics.service';

// MetricsService (6.1) é o motor único de status/progresso, consumido por
// qualquer painel de métrica futuro (professor, admin) — exportado pra
// outros módulos poderem injetá-lo sem duplicar a lógica. MetricsAdminService
// (6.2) é específico da visão institucional do admin, não usa o motor 6.1
// diretamente (não precisa de status por-desafio, só contagens
// agregadas) — ver docs/ai/backlog/metricas-professor-admin.md.
@Module({
  imports: [EventsModule, SchoolsModule],
  controllers: [MetricsAdminController],
  providers: [MetricsService, MetricsAdminService],
  exports: [MetricsService],
})
export class MetricsModule {}
