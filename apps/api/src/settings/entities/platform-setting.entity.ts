import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// Configuração global da plataforma, não por escola/turma/desafio — uma
// única linha (ver SettingsService.getOrCreate). Hoje só o limiar de
// amostra pequena (6.5), mas a tabela já nasce genérica o suficiente pra
// acumular outro campo de config futuro sem precisar de uma tabela nova
// por configuração.
@Entity('platform_settings')
export class PlatformSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // N mínimo de alunos abaixo do qual o relatório de profundidade por
  // desafio (6.5) mostra aviso de amostra pequena em vez de apresentar a
  // estatística sem contexto — nunca recalcula/oculta o número, só decide
  // se o aviso aparece (ver MetricsAdminChallengeService).
  @Column({ type: 'int', default: 5 })
  minSampleSizeThreshold: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
