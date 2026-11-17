'use strict';
(function(root){
  const limits={row:1048576,column:16384};
  const column=text=>[...text.toUpperCase()].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);
  function letters(n){let text='';while(n>0){n--;text=String.fromCharCode(65+n%26)+text;n=Math.floor(n/26);}return text;}
  function parse(text){const m=/^(\$?)([A-Z]{1,3})(\$?)([1-9]\d{0,6})$/i.exec(text);return m&&column(m[2])<=limits.column&&Number(m[4])<=limits.row?{column:column(m[2]),row:Number(m[4]),ac:m[1],ar:m[3]}:null;}
  const cell=p=>p.ac+letters(p.column)+p.ar+p.row;
  function point(value,op){if(op.mode==='insert')return value>=op.at?value+op.count:value;return value<op.at?value:value>=op.at+op.count?value-op.count:null;}
  function interval(a,b,op){
    const reverse=a>b;if(reverse)[a,b]=[b,a];let result;
    if(op.mode==='insert')result=[a>=op.at?a+op.count:a,b>=op.at?b+op.count:b];
    else {const last=op.at+op.count-1,first=a<op.at?a:last+1,end=b>last?b:op.at-1;if(b<op.at)result=[a,b];else if(a>last)result=[a-op.count,b-op.count];else if(first>end)return null;else result=[first>last?first-op.count:first,end>last?end-op.count:end];}
    return reverse?result.reverse():result;
  }
  function range(text,op){
    const parts=text.split(':'),a=parse(parts[0]),b=parse(parts[1]||parts[0]);
    if(a&&b){const next=parts.length===1?(point(a[op.axis],op)===null?null:[point(a[op.axis],op)]):interval(a[op.axis],b[op.axis],op);if(!next)return null;a[op.axis]=next[0];b[op.axis]=next[next.length-1];if([a,b].some(p=>p.row<1||p.column<1||p.row>limits.row||p.column>limits.column))return '#REF!';return cell(a)+(parts.length===2?':'+cell(b):'');}
    const cols=/^(\$?)([A-Z]{1,3}):(\$?)([A-Z]{1,3})$/i.exec(text),rows=/^(\$?)([1-9]\d{0,6}):(\$?)([1-9]\d{0,6})$/.exec(text);
    if(cols){if(op.axis!=='column')return text;const next=interval(column(cols[2]),column(cols[4]),op);return next&&next.every(n=>n>0&&n<=limits.column)?cols[1]+letters(next[0])+':'+cols[3]+letters(next[1]):null;}
    if(rows){if(op.axis!=='row')return text;const next=interval(Number(rows[2]),Number(rows[4]),op);return next&&next.every(n=>n>0&&n<=limits.row)?rows[1]+next[0]+':'+rows[3]+next[1]:null;}
    return text;
  }
  const token=/((?:'(?:[^']|'')+'|(?:\[[^\]]+\])?[\p{L}_\\][\p{L}\p{N}_.\\]*)!)?(\$?[A-Z]{1,3}\$?[1-9]\d{0,6}(?::\$?[A-Z]{1,3}\$?[1-9]\d{0,6})?|\$?[A-Z]{1,3}:\$?[A-Z]{1,3}|\$?[1-9]\d{0,6}:\$?[1-9]\d{0,6})/giu;
  function rewrite(formula,apply){
    return String(formula).split(/("(?:[^"]|"")*")/g).map((part,index)=>index%2?part:part.replace(token,(whole,prefix,reference,offset,source)=>{
      const before=source[offset-1]||'',after=source[offset+whole.length]||'';
      if(/[\p{L}\p{N}_.$\[\]]/u.test(before)||/[\p{L}\p{N}_.!(]/u.test(after))return whole;
      return apply(prefix||'',reference)||whole;
    })).join('');
  }
  function formula(text,op,currentSheet){return rewrite(text,(prefix,reference)=>{
    const name=prefix?prefix.slice(0,-1).replace(/^'(.*)'$/s,'$1').replace(/''/g,"'"):currentSheet;
    if(!name||name.includes('[')||name.toLowerCase()!==op.sheet.toLowerCase())return prefix+reference;
    return prefix+(range(reference,op)||'#REF!');
  });}
  function translate(text,dr,dc){return rewrite(text,(prefix,reference)=>{
    const parts=reference.split(':'),result=[];
    for(const part of parts){const p=parse(part);if(p){if(!p.ac)p.column+=dc;if(!p.ar)p.row+=dr;if(p.column<1||p.column>limits.column||p.row<1||p.row>limits.row)return prefix+'#REF!';result.push(cell(p));}
      else if(/^\$?[A-Z]{1,3}$/i.test(part)){const n=column(part.replace('$',''))+(part[0]==='$'?0:dc);if(n<1||n>limits.column)return prefix+'#REF!';result.push((part[0]==='$'?'$':'')+letters(n));}
      else if(/^\$?[1-9]\d*$/.test(part)){const n=Number(part.replace('$',''))+(part[0]==='$'?0:dr);if(n<1||n>limits.row)return prefix+'#REF!';result.push((part[0]==='$'?'$':'')+n);}
      else return prefix+reference;
    }
    return prefix+result.join(':');
  });}
  const has3D=text=>String(text).split(/("(?:[^"]|"")*")/g).some((part,i)=>!(i%2)&&/(?:'(?:[^']|'')*:(?:[^']|'')*'|[\p{L}_][\p{L}\p{N}_.]*:[\p{L}_][\p{L}\p{N}_.]*)!/u.test(part));
  const api={point,interval,range,formula,translate,parse,cell,column,letters,limits,has3D};if(typeof module==='object'&&module.exports)module.exports=api;else root.WorkbookReference=api;
})(globalThis);
