import { Column, DeleteDateColumn } from 'typeorm';

// B1 — soft delete como infraestrutura transversal. Toda entidade que
// representa dado de aluno/turma/alocação/desafio nasce estendendo isto, em
// vez de cada módulo reinventar a própria coluna. `@DeleteDateColumn` é o
// mecanismo nativo do TypeORM: além de guardar o timestamp, ele já injeta
// `deletedAt IS NULL` automaticamente em toda query padrão do repositório
// (`find`/`findOne`/`count`/`update`/`delete` via `softDelete`) — é o que
// satisfaz a AC "registro excluído nunca aparece em listagem padrão" sem
// precisar repetir esse filtro em cada service. `withDeleted: true` (ou
// `createQueryBuilder(...).withDeleted()`) inclui os excluídos — é o que a
// tela de auditoria/histórico usa. Não cobre `createQueryBuilder` manual sem
// `.withDeleted()`/filtro explícito — quem escreve uma query raw sobre uma
// entidade que estende isto precisa adicionar `deletedAt IS NULL` à mão (ver
// nota em SchoolsService).
//
// `deletedByUserId` complementa o "quem" que o TypeORM não rastreia
// sozinho — sem FK/relation formal de propósito (mesma decisão já tomada
// para `ExportAuditLog.adminUserId`/`AdminActionLog.actorUserId`: defesa em
// profundidade, sem depender de um hard delete de usuário que não existe no
// MVP; aqui nem isso, é só um uuid solto porque a entidade base não conhece
// `User`, e forçar essa dependência aqui obrigaria toda entidade soft
// deletable a importar UsersModule só por causa de uma auditoria).
export abstract class SoftDeletableEntity {
  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  deletedByUserId: string | null;
}
