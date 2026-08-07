// 6.6 — serializador CSV mínimo (RFC 4180), sem dependência nova: o formato
// de saída é fixo (cabeçalho + linhas de texto/número), não precisa de uma
// lib inteira só pra isso. Função pura, sem I/O — testável sem
// NestJS/banco, mesmo raciocínio de metrics/statistics.ts.
export type CsvCell = string | number | null;

function escapeCell(value: CsvCell): string {
  const text = value === null || value === undefined ? '' : String(value);
  // Só entra aspas quando precisa (RFC 4180) — nunca aspas em toda célula,
  // que deixaria o arquivo mais pesado e menos legível sem necessidade.
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ];
  // CRLF (RFC 4180) — Excel/planilhas em geral esperam isso, não só "\n".
  return lines.join('\r\n');
}
