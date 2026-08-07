import type { ChallengeTemplateHandler } from './challenge-template-handler.interface';
import { RegularPolygonTemplateHandler } from './regular-polygon.handler';

// Único lugar que precisa mudar pra cadastrar um template novo (além da
// linha de catálogo em `challenge_templates`, ver migration de seed): uma
// classe implementando ChallengeTemplateHandler + uma entrada aqui. Nenhum
// outro arquivo deste módulo (service/controller) muda — é o que torna a
// biblioteca de templates escalável pra novos desafios/disciplinas sem
// refazer o formulário, a galeria, o preview ou o CRUD do professor.
const HANDLERS: ChallengeTemplateHandler[] = [new RegularPolygonTemplateHandler()];

const HANDLERS_BY_KEY = new Map(HANDLERS.map((handler) => [handler.key, handler]));

export function getTemplateHandler(key: string): ChallengeTemplateHandler | undefined {
  return HANDLERS_BY_KEY.get(key);
}
