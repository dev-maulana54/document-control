'use strict';
(function(root){
  // Parse expressions as data; never execute formula text as JavaScript.
  const fail=code=>{throw new Error(code);};
  const number=value=>{if(typeof value==='string'&&value.startsWith('#'))fail(value);if(value===null||value==='')return 0;if(!Number.isFinite(Number(value)))fail('#VALUE!');return Number(value);};
  function evaluate(source,resolve){
    try{
      if(source.length>4000)fail('#NUM!');
      const input=source.replace(/^=/,'');let offset=0,token,steps=0;
      function next(){
        const match=/^\s*(#(?:REF!|VALUE!|DIV\/0!|NAME\?|NUM!|N\/A|NULL!)|\d+(?:\.\d*)?(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?|"(?:[^"]|"")*"|'(?:[^']|'')*'!\$?[A-Z]+\$?\d+|(?:[A-Z_][\w.]*!)?\$?[A-Z]+\$?\d+|[A-Z_][\w.]*|<>|<=|>=|[+*/^%(),;:=<>-])/i.exec(input.slice(offset));
        if(!match){if(input.slice(offset).trim())fail('#VALUE!');token='';return;}
        offset+=match[0].length;token=match[1];
      }
      const take=t=>{if(token!==t)fail('#VALUE!');next();};
      const precedence={'=':1,'<>':1,'<':1,'>':1,'<=':1,'>=':1,'+':2,'-':2,'*':3,'/':3,'^':4};
      function expression(level=0,depth=0){
        if(depth>100||++steps>2000)fail('#NUM!');
        let node;const value=token;next();
        if(value==='+'||value==='-')node={op:'unary',sign:value,arg:expression(4,depth+1)};
        else if(value==='('){node=expression(0,depth+1);take(')');}
        else if(value.startsWith('#'))node={value:value.toUpperCase()};
        else if(value.startsWith('"'))node={value:value.slice(1,-1).replace(/""/g,'"')};
        else if(/^(?:\d|\.\d)/.test(value))node={value:Number(value)};
        else if(/^(TRUE|FALSE)$/i.test(value))node={value:value.toUpperCase()==='TRUE'};
        else if(token==='('){
          next();const args=[];if(token!==')')while(true){args.push(expression(0,depth+1));if(token!==','&&token!==';')break;next();}
          take(')');node={fn:value.toUpperCase(),args};
        }else if(/\$?[A-Z]+\$?\d+$/i.test(value)){
          node={ref:value};if(token===':'){next();node.end=token;next();}
        }else fail('#VALUE!');
        while(token==='%'){next();node={op:'/',left:node,right:{value:100}};}
        while(precedence[token]&&precedence[token]>=level){const op=token;next();node={op,left:node,right:expression(precedence[op]+(op==='^'?0:1),depth+1)};}
        return node;
      }
      next();const tree=expression();if(token)fail('#VALUE!');
      function reference(ref){
        const match=/^(?:(.*?)!)?(\$?[A-Z]+)\$?([1-9]\d*)$/i.exec(ref);if(!match)fail('#REF!');
        const letters=match[2].replace('$','').toUpperCase(),column=[...letters].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0),row=Number(match[3]);
        if(column>16384||row>1048576)fail('#REF!');return {sheet:match[1]?.replace(/^'|'$/g,'').replace(/''/g,"'"),column,row,ref:letters+row};
      }
      const letters=n=>{let s='';for(;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
      function run(node,depth=0){
        if(depth>100)fail('#NUM!');
        const read=n=>run(n,depth+1);
        if('value'in node)return node.value;
        if(node.ref){
          const a=reference(node.ref);if(!node.end)return resolve(a.ref,a.sheet);
          const b=reference(node.end);if(b.sheet&&b.sheet!==a.sheet)fail('#REF!');
          if((Math.abs(b.row-a.row)+1)*(Math.abs(b.column-a.column)+1)>10000)fail('#NUM!');
          const values=[];for(let r=Math.min(a.row,b.row);r<=Math.max(a.row,b.row);r++)for(let c=Math.min(a.column,b.column);c<=Math.max(a.column,b.column);c++)values.push(resolve(letters(c)+r,a.sheet));return values;
        }
        if(node.fn){
          const args=node.args;
          if(node.fn==='IF'){if(args.length<2||args.length>3)fail('#VALUE!');const condition=read(args[0]);if(typeof condition==='string'&&condition.startsWith('#'))fail(condition);return condition?read(args[1]):args[2]?read(args[2]):false;}
          if(node.fn==='IFERROR'){if(args.length!==2)fail('#VALUE!');try{const v=read(args[0]);if(typeof v==='string'&&v.startsWith('#'))fail(v);return v;}catch{return read(args[1]);}}
          const values=args.map(read).flat();for(const v of values)if(typeof v==='string'&&v.startsWith('#'))fail(v);
          const nums=values.filter(v=>typeof v==='number');
          switch(node.fn){
            case 'SUM':return nums.reduce((a,b)=>a+b,0);
            case 'AVERAGE':if(!nums.length)fail('#DIV/0!');return nums.reduce((a,b)=>a+b,0)/nums.length;
            case 'MIN':return nums.length?Math.min(...nums):0;
            case 'MAX':return nums.length?Math.max(...nums):0;
            case 'COUNT':return nums.length;
            case 'COUNTA':return values.filter(v=>v!==null&&v!=='').length;
            case 'ABS':if(args.length!==1)fail('#VALUE!');return Math.abs(number(values[0]));
            case 'ROUND':{if(args.length!==2)fail('#VALUE!');const n=number(values[0]),factor=10**Math.trunc(number(values[1]));return Math.sign(n)*Math.round((Math.abs(n)+Number.EPSILON)*factor)/factor;}
            default:fail('#NAME?');
          }
        }
        if(node.op==='unary')return number(read(node.arg))*(node.sign==='-'?-1:1);
        const a=read(node.left),b=read(node.right);
        if(['=','<>','<','>','<=','>='].includes(node.op)){
          if(typeof a==='string'&&a.startsWith('#'))fail(a);if(typeof b==='string'&&b.startsWith('#'))fail(b);
          return {'=':()=>a===b,'<>':()=>a!==b,'<':()=>a<b,'>':()=>a>b,'<=':()=>a<=b,'>=':()=>a>=b}[node.op]();
        }
        const x=number(a),y=number(b);if(node.op==='/'&&y===0)fail('#DIV/0!');
        return {'+':()=>x+y,'-':()=>x-y,'*':()=>x*y,'/':()=>x/y,'^':()=>x**y}[node.op]();
      }
      const value=run(tree);return value===null?0:Array.isArray(value)?'#VALUE!':typeof value==='number'&&!Number.isFinite(value)?'#NUM!':value;
    }catch(error){return /^#[A-Z0-9/?!]+$/.test(error.message)?error.message:'#VALUE!';}
  }
  function editable(cell,E){const f=cell&&E.child(cell,'f');return !f||!f.getAttribute('t')||f.getAttribute('t')==='normal';}
  function input(book,cell,E){const f=cell&&E.child(cell,'f');return f?.textContent?'='+f.textContent:E.value(book,cell);}
  function recalculate(book,E){
    const cache=new Map(),visiting=new Set();
    function read(index,ref,depth=0){
      const key=index+':'+ref;if(cache.has(key))return cache.get(key);if(visiting.has(key))return '#REF!';if(depth>100)return '#NUM!';
      const sheet=book.sheets[index],cell=sheet?.cells.get(ref);if(!sheet)return '#REF!';if(!cell)return null;
      const f=E.child(cell,'f');if(!f||!editable(cell,E)){
        const value=E.value(book,cell),type=cell.getAttribute('t');return type==='b'?value==='TRUE':(!type||type==='n')&&value!==''?Number(value):value;
      }
      visiting.add(key);
      const result=evaluate('='+f.textContent,(reference,name)=>read(name===undefined?index:book.sheets.findIndex(s=>s.name.toLowerCase()===name.toLowerCase()),reference,depth+1));
      visiting.delete(key);
      // Unsupported imported functions retain their Excel cache until Excel recalculates.
      if(result==='#NAME?'&&E.child(cell,'v')){const raw=E.value(book,cell),value=(!cell.getAttribute('t')||cell.getAttribute('t')==='n')?Number(raw):raw;cache.set(key,value);return value;}
      cache.set(key,result);
      let v=E.child(cell,'v');if(!v){v=sheet.xml.createElementNS(sheet.xml.documentElement.namespaceURI,'v');cell.appendChild(v);}
      const type=typeof result==='boolean'?'b':typeof result==='number'||result===null?'n':String(result).startsWith('#')?'e':'str',text=result===null?'0':typeof result==='boolean'?(result?'1':'0'):String(result);
      if(v.textContent!==text||cell.getAttribute('t')!==type){v.textContent=text;cell.setAttribute('t',type);book.modified.add(index);}
      return result;
    }
    for(let i=0;i<book.sheets.length;i++)for(const [ref,cell] of book.sheets[i].cells)if(E.child(cell,'f'))read(i,ref);
  }
  const api={evaluate,recalculate,editable,input};if(typeof module==='object'&&module.exports)module.exports=api;else root.WorkbookFormulas=api;
})(globalThis);
