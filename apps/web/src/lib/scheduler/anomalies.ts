import type { Classification } from './engine';

// Definições exatas da disciplina (Banco de Dados II, Unidade III), usadas
// literalmente no feedback. Não parafrasear.
export const ANOMALY_LABEL: Record<Classification, string> = {
  lost_update: 'Perda de atualização',
  dirty_read: 'Atualização temporária (leitura suja)',
  incorrect_summary: 'Agregação incorreta',
  none: 'Nenhuma anomalia (execução correta)',
};

export const ANOMALY_DEFINITION: Record<Classification, string> = {
  lost_update:
    'Duas transações leem o mesmo valor antigo de um item antes de qualquer uma gravar; a última gravação sobrescreve a da primeira, perdendo a alteração dela.',
  dirty_read:
    'Uma transação lê um valor gravado por outra que ainda não deu commit; se essa segunda sofrer rollback, a primeira trabalhou sobre um dado que nunca existiu de fato.',
  incorrect_summary:
    'Uma transação calcula uma função de agregação (soma, média) lendo alguns itens antes de uma atualização concorrente e outros depois dela, misturando valores antigos e novos no resultado.',
  none: 'Nenhuma anomalia: nenhuma transação leu um valor desatualizado ou não confirmado, e o resultado é igual ao de uma execução serial.',
};

// Reforço curto quando o aluno acerta.
export const ANOMALY_REINFORCEMENT: Record<Classification, string> = {
  lost_update: 'Isso mesmo: a gravação de uma transação desapareceu porque a outra partiu de um valor antigo.',
  dirty_read: 'Isso mesmo: o valor lido nunca foi confirmado e foi desfeito pelo rollback.',
  incorrect_summary: 'Isso mesmo: a soma misturou valores de antes e de depois da atualização.',
  none: 'Isso mesmo: apesar da intercalação, nada foi lido fora de hora e o resultado é igual ao serial.',
};

export const CLASSIFICATION_ORDER: Classification[] = ['lost_update', 'dirty_read', 'incorrect_summary', 'none'];
