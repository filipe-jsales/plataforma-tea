// Categorias do schema de logging estruturado (requisito de arquitetura desde o MVP,
// não um débito técnico — ver RQ5 do mapeamento sistemático).
export enum EventCategory {
  // RD-I: Interação — cliques, encaixes/desencaixes de bloco, tempo entre ações.
  INTERACTION = 'RD-I',
  // RD-P: Produto — estado do programa de blocos montado pelo aluno (snapshot/XML).
  PRODUCT = 'RD-P',
  // RD-C: Curricular — acerto/erro do conceito da disciplina embutido no desafio.
  CURRICULAR = 'RD-C',
  // RD-E: Engajamento-proxy — sinais observáveis (tempo de inatividade, tentativas),
  // NUNCA inferência clínica (ver regra não-negociável 7).
  ENGAGEMENT_PROXY = 'RD-E',
  // RD-L: Longitudinal — marcos de progresso ao longo do tempo, entre sessões.
  LONGITUDINAL = 'RD-L',
}
