const {test}=require('node:test');
const assert=require('node:assert/strict');
const F=require('../dist/workbook-formulas.js');
const cells={A1:10,A2:20,A3:'catatan',B1:5};
const calc=f=>F.evaluate(f,ref=>cells[ref]??null);
test('aggregates accept ranges, nesting and both argument separators',()=>{
  assert.equal(calc('=sum(A1:A3, B1)'),35);
  assert.equal(calc('=AVERAGE(A1:A3)'),15);
  assert.equal(calc('=MIN(A1:A2)'),10);
  assert.equal(calc('=MAX(A1:A2)'),20);
  assert.equal(calc('=COUNT(A1:A3)'),2);
  assert.equal(calc('=COUNTA(A1:A4)'),3);
  assert.equal(calc('=ROUND(AVERAGE(A1:A2)/7;2)'),2.14);
});
test('arithmetic, absolute references, percent and comparisons',()=>{
  assert.equal(calc('=($A$1+A2)*B1-2^3'),142);
  assert.equal(calc('=A1*10%'),1);
  assert.equal(calc('=2^3^2'),512);
  assert.equal(calc('=IF(A1>5,"Ya","Tidak")'),'Ya');
  assert.equal(calc('=IF(FALSE,1/0,42)'),42);
  assert.equal(calc('=IFERROR(1/0,0)'),0);
  assert.equal(calc('=ROUND(-1.25,1)'),-1.3);
  assert.equal(calc('=A100'),0);
});
test('errors are safe and deterministic',()=>{
  assert.equal(calc('=1/0'),'#DIV/0!');
  assert.equal(calc('=A3+1'),'#VALUE!');
  assert.equal(calc('=SUM('),'#VALUE!');
  assert.equal(calc('=UNKNOWN(1)'),'#NAME?');
  assert.equal(calc('=globalThis.process.exit()'),'#NAME?');
  assert.equal(calc('=SUM(A1:XFD1048576)'),'#NUM!');
  assert.equal(calc('=XFE1'),'#REF!');
  assert.equal(calc('=SUM(#REF!)'),'#REF!');
  assert.equal(calc('=IF(1/0,1,0)'),'#DIV/0!');
});
