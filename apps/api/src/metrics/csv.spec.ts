import { toCsv } from './csv';

describe('toCsv', () => {
  it('renders a header row followed by one line per data row, comma-separated', () => {
    const csv = toCsv(
      ['id', 'type'],
      [
        ['e1', 'program_executed'],
        ['e2', 'block_dragged'],
      ],
    );

    expect(csv.split('\r\n')).toEqual([
      'id,type',
      'e1,program_executed',
      'e2,block_dragged',
    ]);
  });

  it('quotes a cell that contains a comma', () => {
    const csv = toCsv(['payload'], [['{"a":1,"b":2}']]);

    expect(csv.split('\r\n')[1]).toBe('"{""a"":1,""b"":2}"');
  });

  it('quotes and escapes a cell that contains a double quote', () => {
    const csv = toCsv(['note'], [['she said "hi"']]);

    expect(csv.split('\r\n')[1]).toBe('"she said ""hi"""');
  });

  it('quotes a cell that contains a newline', () => {
    const csv = toCsv(['note'], [['line1\nline2']]);

    expect(csv.split('\r\n')[1]).toBe('"line1\nline2"');
  });

  it('renders null as an empty cell, never the literal string "null"', () => {
    const csv = toCsv(['sessionId'], [[null]]);

    expect(csv.split('\r\n')[1]).toBe('');
  });

  it('renders just the header row for an empty dataset, never throwing', () => {
    const csv = toCsv(['id', 'type'], []);

    expect(csv).toBe('id,type');
  });
});
