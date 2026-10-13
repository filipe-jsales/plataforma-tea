import { MigrationInterface, QueryRunner } from 'typeorm';

// O design system não usa mais emoji. Os seeds antigos (templates de
// desafio, blocos Blockly e níveis dos mini jogos) gravaram emoji no banco e
// ele vazava pro frontend via API. Migrations antigas ficam intactas
// (histórico); esta limpa o que já foi persistido.
//
// `icon` fica string vazia (a coluna/tipo continua obrigatório, o frontend
// já renderiza o campo decorativo `aria-hidden` sem conteúdo). Emoji embutido
// em rótulo (ex.: "❄️ sólido") perde só o emoji e o espaço que o seguia.
//
// Irreversível de propósito: `down` é no-op (não há como restaurar o emoji
// original por linha, e não queremos).
const EMOJI = /(?:\p{Extended_Pictographic}|️|‍)+\s*/gu;

function strip(value: string): string {
  const cleaned = value.replace(EMOJI, '');
  return cleaned === value ? value : cleaned.trim();
}

function stripDeep(node: unknown): unknown {
  if (typeof node === 'string') return strip(node);
  if (Array.isArray(node)) return node.map(stripDeep);
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([k, v]) => [k, stripDeep(v)]),
    );
  }
  return node;
}

export class RemoveEmojisFromSeededData1789700000000
  implements MigrationInterface
{
  name = 'RemoveEmojisFromSeededData1789700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.cleanJsonColumn(queryRunner, 'challenge_templates', 'parameterSchema');
    await this.cleanJsonColumn(queryRunner, 'blocks', 'blocklyJson');
    await this.cleanJsonColumn(queryRunner, 'mini_game_levels', 'config');

    const templates: { id: string; icon: string }[] = await queryRunner.query(
      `SELECT "id", "icon" FROM "challenge_templates"`,
    );
    for (const t of templates) {
      const cleaned = strip(t.icon);
      if (cleaned !== t.icon) {
        await queryRunner.query(
          `UPDATE "challenge_templates" SET "icon" = $1 WHERE "id" = $2`,
          [cleaned, t.id],
        );
      }
    }
  }

  public async down(): Promise<void> {
    // no-op — ver comentário no topo.
  }

  private async cleanJsonColumn(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<void> {
    const rows: { id: string; value: unknown }[] = await queryRunner.query(
      `SELECT "id", "${column}" AS "value" FROM "${table}"`,
    );
    for (const row of rows) {
      const before = JSON.stringify(row.value);
      const afterValue = stripDeep(row.value);
      if (JSON.stringify(afterValue) !== before) {
        await queryRunner.query(
          `UPDATE "${table}" SET "${column}" = $1::jsonb WHERE "id" = $2`,
          [JSON.stringify(afterValue), row.id],
        );
      }
    }
  }
}
