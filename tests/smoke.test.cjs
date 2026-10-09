const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8');
function harness() {
  const queue=[], nodes={}, noop=()=>{};
  const ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get(o,k){return k in o?o[k]:noop},set(o,k,v){o[k]=v;return true}});
  class Classes{constructor(){this.set=new Set()}add(x){this.set.add(x)}remove(x){this.set.delete(x)}contains(x){return this.set.has(x)}toggle(x,y){y?this.add(x):this.remove(x)}}
  function element(id) {
    if(nodes[id])return nodes[id];
    return nodes[id]={id,value:id==='difficulty'?'normal':id==='mapSelect'?'world':id==='ratio'?'45':'',textContent:'',innerHTML:'',style:{},classList:new Classes(),width:240,height:146,clientWidth:950,clientHeight:680,listeners:{},getContext:()=>ctx,setPointerCapture:noop,append:noop,remove:noop,addEventListener(t,cb){this.listeners[t]=cb},getBoundingClientRect:()=>({left:0,top:0,width:950,height:680}),click(){this.onclick?.()}};
  }
  const document={getElementById:element,createElement:()=>element('generated'+Object.keys(nodes).length),querySelectorAll:()=>['attack','expand','fortify','naval'].map(mode=>({...element('mode'+mode),dataset:{mode}})),addEventListener:noop,documentElement:{requestFullscreen:noop},activeElement:{tagName:'DIV'}};
  let time=10000;
  const window={addEventListener:noop};
  const Path2D=class{moveTo(){}lineTo(){}};
  new Function('document','window','Path2D','requestAnimationFrame','devicePixelRatio','performance','setTimeout',code)(document,window,Path2D,fn=>queue.push(fn),1,{now:()=>time},noop);
  function frames(n) {for(let i=0;i<n;i++){time+=16.7;const cb=queue.shift();assert.ok(cb,'render loop scheduled');cb(time);}}
  function click(x,y) {const el=element('world'),e={pointerId:1,button:0,clientX:x,clientY:y};el.listeners.pointerdown(e);el.listeners.pointerup(e);}
  return {element,frames,click};
}
test('desktop match: spawn, twelve factions, economy, territory offensive',()=>{
  const h=harness();
  h.element('startBtn').click();
  assert.equal(h.element('gameStatus').textContent,'STARTPOSITION WÄHLEN');
  // Fixed point lies deep inside the North-American procedural continental mask.
  h.click(231,186);
  assert.equal(h.element('gameStatus').textContent,'EROBERUNG LÄUFT');
  assert.match(h.element('playerCount').textContent,/12 NATIONEN/);
  const initial=parseFloat(h.element('territory').textContent.replace(',','.'));
  assert.ok(initial>0,'player owns starting territory');
  h.frames(210);
  const recruits=Number(h.element('army').textContent.replaceAll('.',''));
  assert.ok(recruits>1200,'army recruitment is active');
  h.click(248,188);
  h.frames(210);
  const expanded=parseFloat(h.element('territory').textContent.replace(',','.'));
  assert.ok(expanded>initial,'frontline offensive captured additional tiles');
  assert.match(h.element('events').innerHTML,/Offensive/);
});
test('pause toggles and map controls are wired',()=>{
  const h=harness();
  h.element('startBtn').click();h.click(231,186);
  h.frames(20);h.element('pauseBtn').click();
  assert.equal(h.element('gameStatus').textContent,'PAUSIERT');
  const time=h.element('time').textContent;h.frames(220);
  assert.equal(h.element('time').textContent,time);
  h.element('pauseBtn').click();h.frames(220);
  assert.notEqual(h.element('time').textContent,time);
  h.element('speedBtn').click();assert.equal(h.element('speedBtn').textContent,'2×');
});
