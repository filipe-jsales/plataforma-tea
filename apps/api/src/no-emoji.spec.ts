import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// O design system não usa emoji (o backend/banco chegava a vazá-los pro
// frontend via `icon`). Migrations antigas ficam de fora de propósito -
// são histórico imutável, limpo por RemoveEmojisFromSeededData.
const EMOJI = /\p{Emoji_Presentation}|\uFE0F/u;
const SRC = __dirname;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'migrations' ? [] : sourceFiles(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

describe('no emoji in backend source', () => {
  it('has no emoji in any non-migration source file', () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => EMOJI.test(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC, file).split(sep).join('/'));

    expect(offenders).toEqual([]);
  });
});
