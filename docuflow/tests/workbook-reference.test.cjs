const {test}=require('node:test');const assert=require('node:assert/strict');
const R=require('../dist/workbook-reference.js');
const row={axis:'row',at:2,count:1,mode:'insert',sheet:'Main'};
test('structural references shift absolute/relative/cross-sheet ranges without touching literal strings or function names',()=>{
 assert.equal(R.formula('SUM(A1:$B$3)+Other!A2+Main!$C$2+"A2"+LOG10(10)',row,'Main'),'SUM(A1:$B$4)+Other!A2+Main!$C$3+"A2"+LOG10(10)');
 assert.equal(R.formula("'Main'!A2+'QA Team'!A2+A2",row,'Other'),"'Main'!A3+'QA Team'!A2+A2");
 assert.equal(R.formula("'[other.xlsx]Main'!A2+SUM(1:3)",row,'Main'),"'[other.xlsx]Main'!A2+SUM(1:4)");
 assert.equal(R.formula('SUM(A:C)+XFD1',{...row,axis:'column'},'Main'),'SUM(A:D)+#REF!');
});
test('deleted ranges contract and whole deleted references become REF',()=>{
 const op={...row,mode:'delete',count:2};
 for(const [input,output] of [['A1:A5','A1:A3'],['A2:A5','A2:A3'],['A1:A3','A1:A1'],['A2:A3',null],['A5','A3']])assert.equal(R.range(input,op),output);
 assert.equal(R.formula('A2+$B$3+C4+Main!D2',op,'Main'),'#REF!+#REF!+C2+Main!#REF!');
});
test('shared formula translation respects dollar markers and sheet names',()=>{
 assert.equal(R.translate('A1+$B$2+C$3+$D4+Other!A1+"A1"',2,1),'B3+$B$2+D$3+$D6+Other!B3+"A1"');
 assert.equal(R.translate('A1',-1,0),'#REF!');
 assert.equal(R.formula("'O''Brien'!A2",{...row,sheet:"O'Brien"},'Main'),"'O''Brien'!A3");
});
test('3D guards detect escaped apostrophes but ignore string literals',()=>{assert.equal(R.has3D("SUM('Start:O''Brien'!A1)"),true);assert.equal(R.has3D('SUM("Start:End!A1")'),false);});
