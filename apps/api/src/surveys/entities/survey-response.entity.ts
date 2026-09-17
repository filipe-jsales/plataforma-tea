import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Challenge } from '../../challenges/entities/challenge.entity';
import { User } from '../../users/entities/user.entity';

export type SurveyResponseStatus = 'submitted' | 'declined';

// Instrumento de pesquisa (survey de opinião do PROFESSOR sobre a própria
// experiência de autoria) — não é telemetria de interação do aluno, por
// isso é uma tabela própria, nunca uma linha em `interaction_events`: as
// categorias RD-I/P/C/E/L (`EventCategory`) descrevem taxonomia de
// comportamento do ALUNO (regra não-negociável 6), e `countEventsByCategory
// ForChallenge`/`countEventsByTypeForChallenge` (relatório 6.5, admin)
// somam TUDO que tem aquele `challengeId` sem filtrar por
// `studentPseudoId` — misturar opinião de professor ali contaminaria "N de
// alunos que chegaram até este desafio" com uma linha de autoria.
//
// Append-only, igual `interaction_events` (nunca `UPDATE`/`DELETE` numa
// resposta já salva — é dado de pesquisa, reescrever destruiria o registro
// do que a pessoa realmente respondeu naquele momento).
//
// `surveyKey` (não uma tabela por survey) é o que torna isto reutilizável
// pra pesquisas futuras (ver docs/ai/modules/backend.md) — hoje só existe
// `'challenge_creation'` (disparado depois que o professor publica um
// desafio com sucesso, ver SurveysController), mas o schema já aguenta um
// segundo instrumento sem migration nova, só uma chave nova.
@Entity('survey_responses')
@Index(['surveyKey', 'createdAt'])
export class SurveyResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 60 })
  surveyKey: string;

  // Nullable + `ON DELETE SET NULL` (nunca CASCADE): se a conta do
  // professor for removida, a resposta em si continua valendo como dado de
  // pesquisa (mesmo racional de `challenges.createdByUserId`) — só perde a
  // referência de QUEM respondeu, nunca a resposta.
  @Column({ type: 'uuid', nullable: true })
  teacherUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'teacherUserId' })
  teacher: User | null;

  // Nullable + `ON DELETE SET NULL`, mesmo racional de
  // `interaction_events.challengeId`: um desafio pode ser excluído depois
  // (ver TeacherChallenges "Excluir"), mas a opinião sobre CRIAR aquele
  // desafio continua um dado de pesquisa válido.
  @Column({ type: 'uuid', nullable: true })
  challengeId: string | null;

  @ManyToOne(() => Challenge, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'challengeId' })
  challenge: Challenge | null;

  // Snapshot do template usado (`RegularPolygonTemplateHandler.key`, etc.)
  // no momento da resposta — sobrevive mesmo se `challengeId` virar `null`
  // ou o template mudar depois; permite agregar "facilidade de criação por
  // tipo de template" sem precisar fazer JOIN com uma linha que pode não
  // existir mais.
  @Column({ type: 'varchar', length: 60, nullable: true })
  templateKey: string | null;

  // 'declined' registra que a pessoa VIU o convite e escolheu não
  // responder — sem isso não dá pra distinguir "não quis responder" de
  // "nunca viu a pergunta", o que inviabilizaria calcular taxa de resposta
  // (métrica padrão em survey research). Uma linha 'declined' sempre tem
  // `quantitative`/`qualitative` vazios.
  @Column({ type: 'varchar', length: 20 })
  status: SurveyResponseStatus;

  // Itens de escala Likert 1–5 (concordância), chave = id do item (ver
  // lib/challengeCreationSurvey.ts no frontend). Metodologia: "Personal
  // Opinion Surveys in Software Engineering" (Ciolkowski et al., em Shull/
  // Singer/Sjøberg (eds.), Guide to Advanced Empirical Software
  // Engineering, 2008) — escala de concordância validada em vez de escala
  // inventada ad-hoc, um item por conceito (nunca pergunta "dupla-
  // barreled"). Resposta parcial é válida (nem todo item precisa estar
  // presente) — forçar 100% de preenchimento é o tipo de coerção que a
  // literatura de survey desaconselha (viés de resposta forçada).
  @Column({ type: 'jsonb', default: {} })
  quantitative: Record<string, number>;

  // Perguntas abertas — chave = id da pergunta. Metodologia: "Case Study
  // Research in Software Engineering: Guidelines and Examples" (Runeson,
  // Höst, Rainer, Regnell, 2012) — perguntas abertas, não-indutivas,
  // buscando CONTEXTO e RACIONAL ("o que foi difícil", "o que ajudaria"),
  // não um "sim/não" fechado. Mesma regra de resposta parcial do
  // `quantitative` acima.
  @Column({ type: 'jsonb', default: {} })
  qualitative: Record<string, string>;

  @CreateDateColumn()
  createdAt: Date;
}
