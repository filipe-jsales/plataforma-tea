import type { UpdateMiniGameLevelDto } from '../dto/update-mini-game-level.dto';
import type { MiniGameKey } from '../mini-game-level-config.interface';

// MJ9 — um validador por `MiniGameLevel.gameKey` (ver validator-registry.ts)
// é o único ponto de código que muda ao cadastrar um jogo novo. MUITO mais
// simples que `ChallengeTemplateHandler` (challenge-templates/handlers/):
// não existe aqui uma etapa de "traduzir parâmetros de formulário em
// config" — o professor edita campos que já SÃO o formato final
// (theme/targetFraction/fractionPool, por exemplo), então só sobra validar
// e aplicar a mudança em cima do config atual.
export interface MiniGameLevelValidator {
  readonly gameKey: MiniGameKey;

  // Valida `dto` contra o config ATUAL da linha e devolve o config NOVO
  // (merge já aplicado — campos ausentes em `dto` preservam o valor
  // atual). Lança `BadRequestException` com mensagem pedagógica descritiva
  // por campo pra qualquer valor inválido — nunca um 400 genérico de
  // validação de schema (regra não-negociável 9), mesmo padrão que já
  // existia direto em `MinigamesService` antes desta refatoração.
  applyUpdate(
    currentConfig: Record<string, unknown>,
    dto: UpdateMiniGameLevelDto,
  ): Record<string, unknown>;
}
