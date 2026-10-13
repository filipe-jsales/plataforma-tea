import { describe, expect, it } from 'vitest';

// O design system não usa emoji - o glifo é sempre um ícone Lucide (ver
// lib/contentIcons.tsx e docs/ai/modules/frontend.md).
const EMOJI = /\p{Emoji_Presentation}|️/u;

const sources = import.meta.glob(['../**/*.{ts,tsx,css}', '!../**/*.spec.*'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('no emoji in frontend source', () => {
  it('has no emoji in any non-test source file', () => {
    const offenders = Object.entries(sources)
      .filter(([, content]) => EMOJI.test(content))
      .map(([file]) => file);

    expect(Object.keys(sources).length).toBeGreaterThan(50);
    expect(offenders).toEqual([]);
  });
});
