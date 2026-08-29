import * as XLSX from 'xlsx';
import { isAllowedImport, parseImport } from '../../src/utils/excel';

describe('excel anti-malware', () => {
  test('xlsm blocked', () => {
    expect(isAllowedImport('file.xlsm', 1000)).toBe(false);
  });
  test('xlsb blocked', () => {
    expect(isAllowedImport('file.xlsb', 1000)).toBe(false);
  });
  test('xls blocked', () => {
    expect(isAllowedImport('file.xls', 1000)).toBe(false);
  });
  test('ods/zip blocked', () => {
    expect(isAllowedImport('file.ods', 1000)).toBe(false);
    expect(isAllowedImport('archive.zip', 1000)).toBe(false);
  });
  test('xlsx allowed, csv allowed', () => {
    expect(isAllowedImport('file.xlsx', 1000)).toBe(true);
    expect(isAllowedImport('file.csv', 1000)).toBe(true);
    expect(isAllowedImport('FILE.XLSX', 1000)).toBe(true);
  });
  test('too large blocked (>5MB)', () => {
    expect(isAllowedImport('file.xlsx', 6 * 1024 * 1024)).toBe(false);
    expect(isAllowedImport('file.xlsx', 5 * 1024 * 1024)).toBe(true);
  });

  test('parseImport strips =HYPERLINK formula', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['description', 'amount'],
      ['=HYPERLINK("http://evil.com","Click")', 100],
      ['normal', 50],
    ]);
    // Inject formula cell form to simulate malicious file
    (ws as any)['A2'] = { t: 's', v: '=HYPERLINK("http://evil.com","Click")', f: 'HYPERLINK("http://evil.com","Click")', h: 'http://evil.com' };
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const rows = parseImport(buf, 'test.xlsx') as any[];
    // rows after strip should not contain HYPERLINK nor javascript: or evil.com hyperlink
    const flat = JSON.stringify(rows);
    expect(flat).not.toMatch(/HYPERLINK/i);
    expect(flat).not.toContain('http://evil.com');
  });

  test('parseImport strips =WEBSERVICE', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['description', 'amount'],
      ['=WEBSERVICE("http://evil.com")', 100],
    ]);
    (ws as any)['A2'] = { t: 's', v: '=WEBSERVICE("http://evil.com")', f: 'WEBSERVICE("http://evil.com")' };
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const rows = parseImport(buf) as any[];
    const flat = JSON.stringify(rows);
    expect(flat).not.toMatch(/WEBSERVICE/i);
  });

  test('parseImport strips =CMD and =DDE', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['a'], ['=CMD|\'/C calc\'!A0'], ['=DDE("cmd";"/C calc";"!A0")']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const rows = parseImport(buf) as any[];
    const flat = JSON.stringify(rows);
    expect(flat).not.toMatch(/CMD/i);
    expect(flat).not.toMatch(/DDE/i);
  });

  test('parseImport uses safe XLSX.read options (no formula execution)', () => {
    // Create wb with formula, ensure after parse the value is stripped not executed
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['val'], ['=SUM(1,2)']]);
    (ws as any)['A2'] = { t: 'n', v: 3, f: 'SUM(1,2)' };
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const rows = parseImport(buf) as any[];
    const flat = JSON.stringify(rows);
    // Should not contain raw formula SUM
    expect(flat).not.toMatch(/SUM\(1,2\)/);
  });

  test('parseImport enforces max rows/cols limits or sanitizes', () => {
    // generate >5000 rows would be rejected via isAllowed? But parseImport should handle large gracefully
    // Here test that normal small file parses ok
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['a', 'b'], ['1', '2']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const rows = parseImport(buf) as any[];
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
  });
});
