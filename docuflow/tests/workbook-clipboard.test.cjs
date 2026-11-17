const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const sandbox = vm.createContext({ document: { addEventListener() {} } });
vm.runInContext(fs.readFileSync(require.resolve('../dist/workbook-ribbon-actions.js'), 'utf8'), sandbox);
const parse = text => JSON.parse(JSON.stringify(sandbox.parseWorkbookClipboard(text)));

test('clipboard accepts Excel TSV, quoted tabs/newlines and escaped quotes', () => {
  assert.deepEqual(parse('A\tB\r\nC\tD\r\n'), [['A','B'],['C','D']]);
  assert.deepEqual(parse('"baris\nsama"\t"a""b"\t"a\tb"'), [['baris\nsama','a"b','a\tb']]);
  assert.deepEqual(parse('\t'), [['','']]);
  assert.deepEqual(parse('0012\t=1+1'), [['0012','=1+1']]);
});
test('clipboard limits allocation and rejects incomplete quoting', () => {
  assert.throws(() => parse('"unfinished'));
  assert.throws(() => parse('a'.repeat(1024*1024+1)));
  assert.throws(() => parse(Array(5001).fill('a').join('\t')));
});
