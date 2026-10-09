'use strict';

(() => {
const $ = id => document.getElementById(id);
const canvas = $('world'), ctx = canvas.getContext('2d', {alpha:false});
const mini = $('mini'), mctx = mini.getContext('2d');
const stage = $('stage'), W = 270, H = 166, N = W * H;
const colors = ['#58dbb0','#f18a77','#e8bc64','#829dee','#b99af6','#64bed5','#df839f','#a8d474','#ec9a58','#83abae','#cfaf94','#e275c5','#8ac47c','#c38dd8','#d3d57b','#76c9be'];
const names = ['Die Republik','Crimson Union','Goldene Allianz','Nordbund','Violetter Pakt','Ozeanische Liga','Rosenreich','Waldstaat','Sonnenimperium','Atlantische Union','Steppenbund','Magenta-Koalition','Ostföderation','Hochlandpakt','Freistaaten','Azurunion'];
let owner = new Int8Array(N), height = new Uint8Array(N), fort = new Uint8Array(N);
let areas = [], armies = [], capitals = [], fronts = [], effects = [], activeCount = 12;
let totalLand = 0, landIndices = [], state = 'menu', mapType = 'world', difficulty = 'normal';
let seed = 8732, terrainCanvas, territoryCanvas, coastPath = null, borderPaths = [];
let dirty = true, lastUi = 0, elapsed = 0, clock = 0, botClock = 0, speed = 1, paused = false;
let mode = 'attack', ratio = .45, hovered = -1, targetOwner = -2, pointer = null, dragging = false;
let camera = {x:0, y:0, z:3}, keyboard = Object.create(null);
let log = [], round = 0, miniBase = null;
const neighbour = i => {
  const x = i % W, y = Math.floor(i/W), a=[];
  if(x>0)a.push(i-1);
  if(x<W-1)a.push(i+1);
  if(y>0)a.push(i-W);
  if(y<H-1)a.push(i+W);
  return a;
};
const clamp = (a,b,c) => Math.max(b,Math.min(c,a));
const format = n => Math.floor(n).toLocaleString('de-DE');
const formatTime = t => String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');
const percent = x => (x*100).toFixed(1).replace('.',',')+'%';
function hash(x,y) {
  let h = Math.imul(x,374761393)+Math.imul(y,668265263)+seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0)/4294967295;
}
function noise(x,y) {
  const xx=Math.floor(x),yy=Math.floor(y), fx=x-xx,fy=y-yy;
  const a=fx*fx*(3-2*fx),b=fy*fy*(3-2*fy);
  const n1=hash(xx,yy)*(1-a)+hash(xx+1,yy)*a;
  const n2=hash(xx,yy+1)*(1-a)+hash(xx+1,yy+1)*a;
  return n1*(1-b)+n2*b;
}
function randomLandShape(nx,ny) {
  const blobs=mapType==='world' ? [
    [.205,.27,.18,.245],[.29,.48,.093,.13],[.288,.7,.084,.22],
    [.505,.255,.112,.11],[.685,.255,.245,.18],[.53,.51,.12,.24],
    [.75,.47,.12,.15],[.85,.73,.107,.105],[.335,.055,.067,.082],
    [.9,.47,.035,.12],[.59,.78,.033,.067]
  ] : [
    [.14,.24,.105,.16],[.31,.25,.113,.13],[.49,.18,.12,.14],[.69,.23,.13,.12],[.84,.3,.09,.18],
    [.19,.54,.125,.13],[.42,.48,.1,.14],[.6,.48,.115,.14],[.79,.59,.13,.115],
    [.12,.8,.10,.11],[.35,.76,.125,.14],[.55,.8,.12,.13],[.73,.82,.13,.11]
  ];
  let best=-5;
  for(const [x,y,rx,ry] of blobs) {
    let dx=(nx-x)/rx,dy=(ny-y)/ry;
    best=Math.max(best,1-Math.sqrt(dx*dx+dy*dy));
  }
  return best;
}
function createWorld() {
  seed=(Date.now() ^ Math.floor(Math.random()*4294967295))|0;
  owner.fill(-2); height.fill(0); fort.fill(0);
  landIndices=[]; totalLand=0;
  terrainCanvas=document.createElement('canvas');terrainCanvas.width=W;terrainCanvas.height=H;
  const tc=terrainCanvas.getContext('2d'), pic=tc.createImageData(W,H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++) {
    const i=y*W+x, nx=x/W,ny=y/H, coarse=noise(x*.07,y*.07), fine=noise(x*.26+100,y*.26+100);
    const shape=randomLandShape(nx,ny);
    const bump=(coarse-.5)*.38+(fine-.5)*.075;
    const land=shape+bump>(mapType==='world'?.065:.09);
    height[i]=Math.floor(clamp((noise(x*.12+80,y*.12+71)*.7+fine*.3)*255,0,255));
    const waterDepth=noise(x*.035+300,y*.035+50), isShallow=shape+bump>-.045;
    let rgb;
    if(land) {
      owner[i]=-1;landIndices.push(i);totalLand++;
      const e=height[i]/255;
      rgb=[Math.floor(41+e*37),Math.floor(71+e*34),Math.floor(60+e*30)];
    } else {
      rgb=isShallow?[26,71,82]:[12+Math.floor(waterDepth*9),38+Math.floor(waterDepth*15),58+Math.floor(waterDepth*10)];
    }
    const z=i*4;pic.data[z]=rgb[0];pic.data[z+1]=rgb[1];pic.data[z+2]=rgb[2];pic.data[z+3]=255;
  }
  tc.putImageData(pic,0,0);
  buildCoast();
  territoryCanvas=document.createElement('canvas');territoryCanvas.width=W;territoryCanvas.height=H;
  miniBase=document.createElement('canvas');miniBase.width=W;miniBase.height=H;
  miniBase.getContext('2d').drawImage(terrainCanvas,0,0);
  areas=Array(activeCount).fill(0);armies=Array(activeCount).fill(1100);capitals=Array(activeCount).fill(-1);
  fronts=[];effects=[];elapsed=0;botClock=0;clock=0;paused=false;speed=1;dirty=true;log=[];
  $('speedBtn').textContent='1×';$('pauseBtn').textContent='Ⅱ Pause';$('time').textContent='00:00';
  $('mapTitle').textContent=mapType==='world'?'Die Kontinente':'Der Archipel';
  $('events').innerHTML='';$('tip').textContent='Klicke auf das Land, um deine Nation zu gründen. Suche einen Standort mit viel freier Fläche.';
  fitMap();refreshCanvas();updateUI();
}
function buildCoast() {
  coastPath=new Path2D();
  for(let i=0;i<N;i++)if(owner[i]>=-1) {
    const x=i%W,y=Math.floor(i/W);
    if(y===0||owner[i-W]===-2){coastPath.moveTo(x,y);coastPath.lineTo(x+1,y);}
    if(y===H-1||owner[i+W]===-2){coastPath.moveTo(x,y+1);coastPath.lineTo(x+1,y+1);}
    if(x===0||owner[i-1]===-2){coastPath.moveTo(x,y);coastPath.lineTo(x,y+1);}
    if(x===W-1||owner[i+1]===-2){coastPath.moveTo(x+1,y);coastPath.lineTo(x+1,y+1);}
  }
}
function capture(i,p) {
  if(owner[i]===p)return;
  if(owner[i]>=0)areas[owner[i]]--;
  owner[i]=p;fort[i]=0;areas[p]++;dirty=true;
}
function spawn(p,center) {
  capitals[p]=center;
  const x=center%W,y=Math.floor(center/W);
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++) {
    const a=x+dx,b=y+dy;
    if(a>=0&&b>=0&&a<W&&b<H&&dx*dx+dy*dy<=5) {
      const i=b*W+a;if(owner[i]===-1)capture(i,p);
    }
  }
  armies[p]=1200;
}
function initializeFactions(start) {
  spawn(0,start);
  const chosen=[start];
  for(let p=1;p<activeCount;p++) {
    let best=-1,bestScore=-100;
    for(let t=0;t<190;t++) {
      const i=landIndices[Math.random()*landIndices.length|0];
      if(owner[i]!==-1)continue;
      let d=Infinity;for(const s of chosen)d=Math.min(d,Math.hypot((i%W)-(s%W),Math.floor(i/W)-Math.floor(s/W)));
      const score=d+Math.random()*11;
      if(score>bestScore){bestScore=score;best=i;}
    }
    if(best>=0){chosen.push(best);spawn(p,best);}
  }
  state='playing';$('placement').classList.add('hidden');$('gameStatus').textContent='EROBERUNG LÄUFT';$('mapHint').textContent='Klicke auf ein benachbartes Land, um einen Angriff zu starten';
  addEvent('Deine Republik wurde gegründet.',0);
  addEvent((activeCount-1)+' Nationen betreten die Welt.',-1);
  toast('Erobere neutrales Land. Schütze dein Reich.');
}
function fitMap() {
  const ww=stage.clientWidth,hh=stage.clientHeight;
  camera.z=Math.min(ww/W,hh/H)*.96;
  camera.x=(ww-W*camera.z)/2;camera.y=(hh-H*camera.z)/2;
}
function zoom(amount, x, y) {
  const fitted=Math.min(stage.clientWidth/W,stage.clientHeight/H)*.96;
  const next=clamp(camera.z*amount,fitted*.7,fitted*10);
  const f=next/camera.z;
  camera.x=x+(camera.x-x)*f;camera.y=y+(camera.y-y)*f;camera.z=next;
  $('zoomText').textContent=Math.round(camera.z/fitted*100)+'%';
}
function resize() {
  const r=stage.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);fitMap();
}
function refreshCanvas() {
  if(!dirty||!territoryCanvas)return;
  const cx=territoryCanvas.getContext('2d'),pic=cx.createImageData(W,H);
  for(let i=0;i<N;i++) {
    const p=owner[i],off=i*4;
    if(p<0){pic.data[off+3]=0;continue;}
    let hex=colors[p].replace('#','');
    pic.data[off]=parseInt(hex.slice(0,2),16);
    pic.data[off+1]=parseInt(hex.slice(2,4),16);
    pic.data[off+2]=parseInt(hex.slice(4,6),16);
    pic.data[off+3]=217;
  }
  cx.putImageData(pic,0,0);
  borderPaths=Array.from({length:activeCount},()=>new Path2D());
  for(let i=0;i<N;i++) {
    const p=owner[i];if(p<0)continue;
    const x=i%W,y=Math.floor(i/W),path=borderPaths[p];
    if(y===0||owner[i-W]!==p){path.moveTo(x,y);path.lineTo(x+1,y);}
    if(x===0||owner[i-1]!==p){path.moveTo(x,y);path.lineTo(x,y+1);}
    if(x===W-1||owner[i+1]!==p){path.moveTo(x+1,y);path.lineTo(x+1,y+1);}
    if(y===H-1||owner[i+W]!==p){path.moveTo(x,y+1);path.lineTo(x+1,y+1);}
  }
  dirty=false;
}
function growth(p) {return areas[p]?7+Math.pow(areas[p],.72)*2.5:0;}
function capacity(p) {return 1200+areas[p]*38;}
function borderTarget(p,i) {
  const desired=owner[i];
  if(desired===p||desired===-2)return -1;
  if(neighbour(i).some(j=>owner[j]===p))return i;
  // Clicking the interior of a country targets the nearest shared front, if one exists.
  let best=-1,dist=Infinity,tx=i%W,ty=Math.floor(i/W);
  for(let j=0;j<N;j++)if(owner[j]===desired&&neighbour(j).some(k=>owner[k]===p)) {
    const d=(j%W-tx)**2+(Math.floor(j/W)-ty)**2;
    if(d<dist){dist=d;best=j;}
  }
  return best;
}
function attack(p,i,fraction) {
  if(!areas[p]||owner[i]===-2||owner[i]===p)return false;
  if(fronts.filter(f=>f.p===p).length>= (p===0?4:2))return false;
  const target=borderTarget(p,i);
  if(target<0)return false;
  const troops=Math.floor(armies[p]*fraction);
  if(troops<35)return false;
  armies[p]-=troops;
  fronts.push({p,enemy:owner[target],origin:target,queue:[target],seen:new Set(),troops,initial:troops,x:target%W,y:Math.floor(target/W),age:0});
  if(p===0){const def=owner[target];addEvent('Offensive auf '+(def<0?'neutrales Gebiet':names[def])+' gestartet.',0);}
  return true;
}
function endFront(f) {
  const k=fronts.indexOf(f);if(k>=0)fronts.splice(k,1);
  if(areas[f.p])armies[f.p]=Math.min(capacity(f.p),armies[f.p]+Math.max(0,f.troops)*.6);
}
function processFront(f) {
  f.age+=.16;
  let moved=0,attempt=0;
  while(f.queue.length&&attempt++<13&&moved<5) {
    const i=f.queue.shift();
    if(f.seen.has(i)||owner[i]===-2||owner[i]===f.p)continue;
    f.seen.add(i);
    if(owner[i]!==f.enemy)continue;
    if(!neighbour(i).some(j=>owner[j]===f.p))continue;
    let victim=owner[i],cost;
    if(victim===-1)cost=8+(height[i]>175?4:0);
    else {
      const density=armies[victim]/Math.max(1,areas[victim]);
      cost=17+clamp(density*2.1,0,115)+fort[i]*35+(height[i]>175?7:0);
    }
    if(f.troops<cost){f.queue.length=0;break;}
    f.troops-=cost;
    if(victim>=0) {
      armies[victim]=Math.max(0,armies[victim]-cost*.5);
      if(areas[victim]===1&&f.p===0)addEvent(names[victim]+' steht vor dem Zusammenbruch.',victim);
    }
    capture(i,f.p);f.x=i%W;f.y=Math.floor(i/W);moved++;
    if(effects.length<180)effects.push({x:f.x+.5,y:f.y+.5,p:f.p,life:1});
    for(const j of neighbour(i))if(!f.seen.has(j)&&owner[j]===f.enemy)f.queue.push(j);
  }
  if(!f.queue.length||f.troops<8||f.age>32)endFront(f);
}
function aiStep() {
  const max=activeCount;
  for(let p=1;p<max;p++) {
    if(!areas[p]||fronts.some(f=>f.p===p))continue;
    const spend=Math.floor(armies[p]);
    if(spend<(difficulty==='hard'?170:300))continue;
    const options=[],seen=new Set();
    for(let i=0;i<N;i++)if(owner[i]===p)for(const j of neighbour(i))if(owner[j]!==p&&owner[j]!==-2&&!seen.has(j)) {
      seen.add(j);options.push(j);
    }
    if(!options.length)continue;
    let best=-1,score=-1e9;
    for(let tries=0;tries<Math.min(50,options.length);tries++) {
      const i=options[Math.random()*options.length|0],foe=owner[i],noise=Math.random()*14;
      let s=foe===-1?40:19;
      if(foe>=0)s+=armies[p]>armies[foe]*.8?25: -20;
      if(foe===0&&difficulty==='hard')s+=14;
      s+=noise;
      if(s>score){score=s;best=i;}
    }
    if(best>=0)attack(p,best,clamp((difficulty==='hard'?.52:.40)+Math.random()*.24,.15,.82));
  }
}
function victoryCheck() {
  if(state!=='playing')return;
  const occupied=areas.reduce((a,b)=>a+b,0);
  const rival=areas.slice(1).reduce((a,b)=>a+b,0);
  if(areas[0]===0)return finish(false);
  if((areas[0]/totalLand>.82&&rival<areas[0]*.08)||rival===0&&areas[0]/totalLand>.65)return finish(true);
}
function finish(win) {
  state='finished';$('endOverlay').classList.remove('hidden');$('gameStatus').textContent=win?'SIEG':'NIEDERLAGE';
  $('endTitle').textContent=win?'WELT EROBERT':'REICH GEFALLEN';
  $('endStats').textContent='Spieldauer '+formatTime(elapsed)+' · Erobertes Land '+percent(areas[0]/totalLand)+' · Armeestärke '+format(armies[0]);
}
function simulate(dt) {
  elapsed+=dt;
  for(let p=0;p<activeCount;p++)if(areas[p])armies[p]=Math.min(capacity(p),armies[p]+growth(p)*dt);
  clock+=dt;botClock+=dt;
  if(clock>=.16) {
    clock-=.16;
    for(const f of fronts.slice())processFront(f);
    effects.forEach(f=>f.life-=.035);effects=effects.filter(f=>f.life>0);
  }
  const cadence=difficulty==='easy'?1.45:difficulty==='hard'?.60:.88;
  if(botClock>=cadence){botClock-=cadence;aiStep();victoryCheck();}
}
function addEvent(message,p=-1) {
  const col=p>=0?colors[p]:'#8ea9b8';
  log.unshift({message,col,time:formatTime(elapsed)});
  log=log.slice(0,6);
  $('events').innerHTML=log.map(e=>'<div class="event"><i style="background:'+e.col+'"></i><span>'+escapeHtml(e.message)+'<time>'+e.time+'</time></span></div>').join('');
}
function escapeHtml(s) {return String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[x]));}
function toast(s,error=false) {
  const el=document.createElement('div');el.className='toast'+(error?' error':'');el.textContent=s;$('toasts').append(el);
  setTimeout(()=>el.remove(),3300);
}
function updateUI() {
  const own=areas[0]||0,cap=capacity(0);
  $('territory').textContent=percent(own/Math.max(1,totalLand));
  $('tiles').textContent=format(own)+' Gebiete';
  $('army').textContent=format(armies[0]||0);
  $('growth').textContent='+'+format(growth(0))+' / Sek.';
  $('capacity').textContent=format(armies[0]||0)+' / '+format(cap);
  $('capMeter').style.width=clamp(armies[0]/cap*100,0,100)+'%';
  $('time').textContent=formatTime(elapsed);
  $('playerCount').textContent=areas.filter(x=>x>0).length+' NATIONEN';
  const a=areas.map((size,p)=>({size,p})).filter(x=>x.size).sort((a,b)=>b.size-a.size);
  $('rankings').innerHTML=a.map((item,k)=>'<div class="rank-row '+(item.p===0?'you':'')+'"><span class="rank-no">'+(k+1)+'</span><span class="swatch" style="background:'+colors[item.p]+'"></span><span class="rank-name">'+names[item.p]+'</span><span class="rank-percent">'+(item.size/totalLand*100).toFixed(1).replace('.',',')+'%</span><div class="rank-track"><div style="width:'+item.size/totalLand*100+'%;background:'+colors[item.p]+'"></div></div></div>').join('');
  updateIntel();
}
function updateIntel() {
  const p=targetOwner;
  if(p===-2){$('intel').innerHTML='<span class="muted">Bewege die Maus über ein Gebiet, um Informationen zu erhalten.</span>';return;}
  if(p===-1){$('intel').innerHTML='<div class="intel-title">Unbesetztes Land</div><div class="muted">Leicht zu erobern. Keine gegnerischen Truppen.</div>';return;}
  $('intel').innerHTML='<div class="intel-title" style="color:'+colors[p]+'">'+names[p]+'</div>'+
  '<div class="intel-row"><span>Gebiete</span><b>'+format(areas[p])+'</b></div>'+
  '<div class="intel-row"><span>Armee</span><b>'+format(armies[p])+'</b></div>'+
  '<div class="intel-row"><span>Produktion</span><b>+'+format(growth(p))+'/s</b></div>';
}
function setMode(next) {
  mode=next;
  document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===next));
  $('tip').textContent=next==='attack'?'Klicke auf ein fremdes Gebiet. Es muss eine gemeinsame Grenze bestehen. Deine Offensive breitet sich über die Front aus.':next==='expand'?'Expandiere nur in neutrale Gebiete. Eine schnelle Expansion bringt mehr Wachstum, kostet aber Truppen.':'Klicke auf ein eigenes Gebiet, um es für 180 Truppen zu befestigen. Jede Stufe erhöht die gegnerischen Eroberungskosten.';
}
function onMapClick(i) {
  if(owner[i]===-2){toast('Hier ist Wasser. Wähle eine Landfläche.',true);return;}
  if(state==='placing'){if(owner[i]!==-1)return;initializeFactions(i);return;}
  if(state!=='playing'||paused)return;
  if(mode==='fortify') {
    if(owner[i]!==0){toast('Befestigungen funktionieren nur auf deinem Land.',true);return;}
    if(armies[0]<180){toast('Du brauchst 180 Truppen für eine Befestigung.',true);return;}
    if(fort[i]>=3){toast('Maximale Befestigungsstufe erreicht.');return;}
    armies[0]-=180;fort[i]++;toast('Gebiet befestigt · Stufe '+fort[i]);updateUI();return;
  }
  if(mode==='expand'&&owner[i]!==-1){toast('Expansionsmodus: nur neutrales Gebiet.',true);return;}
  if(owner[i]===0){toast('Klicke außerhalb deines Reiches auf eine benachbarte Nation.');return;}
  if(!attack(0,i,ratio))toast('Keine gemeinsame Grenze oder zu wenige freie Truppen.',true);
  updateUI();
}
function tileAt(x,y) {
  const wx=Math.floor((x-camera.x)/camera.z),wy=Math.floor((y-camera.y)/camera.z);
  return wx>=0&&wx<W&&wy>=0&&wy<H?wy*W+wx:-1;
}
function mousePosition(e) {
  const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};
}
function updateHover(i) {
  if(hovered===i)return;hovered=i;
  targetOwner=i<0?-2:owner[i];
  const x=i<0?0:i%W,y=i<0?0:Math.floor(i/W);
  $('coord').textContent=i<0?'—':Math.round(x/W*360-180)+'° / '+Math.round(90-y/H*180)+'°';
  $('hoverInfo').textContent=i<0?'Außerhalb der Karte':owner[i]===-2?'Ozean':owner[i]===-1?'Neutrales Gebiet':names[owner[i]]+(fort[i]?' · Festung '+fort[i]:'');
  updateIntel();
}
function prepareFrame() {
  refreshCanvas();
  const dpr=Math.min(devicePixelRatio||1,2),ww=stage.clientWidth,hh=stage.clientHeight;
  if(canvas.width!==Math.round(ww*dpr)||canvas.height!==Math.round(hh*dpr))resize();
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='#102f43';ctx.fillRect(0,0,ww,hh);
  if(!terrainCanvas)return;
  ctx.save();ctx.translate(camera.x,camera.y);ctx.scale(camera.z,camera.z);
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(terrainCanvas,0,0);
  ctx.drawImage(territoryCanvas,0,0);
  ctx.strokeStyle='#92e1c268';ctx.lineWidth=Math.max(.19,1.2/camera.z);ctx.stroke(coastPath);
  ctx.lineWidth=Math.max(.30,1.35/camera.z);
  for(let p=0;p<activeCount;p++){ctx.strokeStyle=colors[p];ctx.stroke(borderPaths[p]);}
  ctx.restore();
  // Permanent country labels at capital positions.
  const font=clamp(camera.z*3.1,10,14);
  ctx.textAlign='center';ctx.font='800 '+font+'px Outfit, sans-serif';
  for(let p=0;p<activeCount;p++)if(areas[p]&&capitals[p]>=0) {
    const i=capitals[p];if(owner[i]!==p)continue;
    const x=camera.x+(i%W+.5)*camera.z,y=camera.y+(Math.floor(i/W)+.5)*camera.z;
    if(x<0||y<0||x>ww||y>hh)continue;
    ctx.fillStyle='#061923aa';ctx.fillRect(x-2,y-20,4,4);
    ctx.strokeStyle='#041722d9';ctx.lineWidth=3;ctx.strokeText(names[p],x,y-8);
    ctx.fillStyle=p===0?'#d9fff2':'#edf3fa';ctx.fillText(names[p],x,y-8);
    ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fillStyle=colors[p];ctx.fill();
  }
  // Front indicators pulse while a real, troop-funded offensive advances.
  for(const f of fronts) {
    const x=camera.x+(f.x+.5)*camera.z,y=camera.y+(f.y+.5)*camera.z;
    if(x<0||x>ww||y<0||y>hh)continue;
    const r=7+(Math.sin(performance.now()*.007+f.p)*.5+.5)*6;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.strokeStyle=colors[f.p];ctx.lineWidth=2.1;ctx.stroke();
    ctx.fillStyle='#061923cf';ctx.fillRect(x-22,y-26,44,15);
    ctx.fillStyle='#f0f6fa';ctx.font='700 10px DM Sans';ctx.textAlign='center';ctx.fillText(format(f.troops),x,y-15);
  }
  for(const e of effects) {
    const x=camera.x+e.x*camera.z,y=camera.y+e.y*camera.z;
    ctx.beginPath();ctx.arc(x,y,(1-e.life)*17+3,0,Math.PI*2);
    ctx.strokeStyle='rgba(235,255,244,'+Math.max(0,e.life*.65)+')';ctx.lineWidth=1.5;ctx.stroke();
  }
  if(hovered>=0&&owner[hovered]!==-2) {
    const x=camera.x+(hovered%W)*camera.z,y=camera.y+Math.floor(hovered/W)*camera.z;
    ctx.strokeStyle='#fff9e1';ctx.lineWidth=1.5;ctx.strokeRect(x,y,camera.z,camera.z);
  }
}
function drawMini() {
  if(!terrainCanvas)return;
  const ww=mini.width,hh=mini.height;
  mctx.clearRect(0,0,ww,hh);
  mctx.drawImage(terrainCanvas,0,0,ww,hh);mctx.drawImage(territoryCanvas,0,0,ww,hh);
  const x=-camera.x/camera.z/W*ww,y=-camera.y/camera.z/H*hh;
  const rw=stage.clientWidth/camera.z/W*ww,rh=stage.clientHeight/camera.z/H*hh;
  mctx.strokeStyle='#ffffff';mctx.lineWidth=1.7;mctx.strokeRect(x,y,rw,rh);
}
function loop(t) {
  const dt=Math.min(.05,(t-lastUi)/1000 || 0);lastUi=t;
  const pan=380*dt;
  if(keyboard.KeyW||keyboard.ArrowUp)camera.y+=pan;
  if(keyboard.KeyS||keyboard.ArrowDown)camera.y-=pan;
  if(keyboard.KeyA||keyboard.ArrowLeft)camera.x+=pan;
  if(keyboard.KeyD||keyboard.ArrowRight)camera.x-=pan;
  if(state==='playing'&&!paused)simulate(dt*speed);
  prepareFrame();
  if(t%240<18){updateUI();drawMini();}
  requestAnimationFrame(loop);
}
function begin() {
  difficulty=$('difficulty').value;mapType=$('mapSelect').value;
  activeCount=difficulty==='easy'?8:difficulty==='hard'?16:12;
  round++;createWorld();$('startOverlay').classList.add('hidden');$('endOverlay').classList.add('hidden');
  state='placing';$('placement').classList.remove('hidden');$('gameStatus').textContent='STARTPOSITION WÄHLEN';
  $('mapHint').textContent='Klicke auf eine freie Landfläche';
  toast('Wähle einen Startpunkt auf einem Kontinent.');
}
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{
  const p=mousePosition(e);pointer={x:p.x,y:p.y,startX:p.x,startY:p.y,id:e.pointerId};dragging=e.button===2;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
  const p=mousePosition(e);
  if(pointer&&pointer.id===e.pointerId) {
    if(Math.hypot(p.x-pointer.startX,p.y-pointer.startY)>6)dragging=true;
    if(dragging){camera.x+=p.x-pointer.x;camera.y+=p.y-pointer.y;}
    pointer.x=p.x;pointer.y=p.y;
  }
  updateHover(tileAt(p.x,p.y));
});
canvas.addEventListener('pointerup',e=>{
  if(!pointer||pointer.id!==e.pointerId)return;
  const p=mousePosition(e);
  if(!dragging&&e.button===0){const i=tileAt(p.x,p.y);if(i>=0)onMapClick(i);}
  pointer=null;dragging=false;
});
canvas.addEventListener('pointercancel',()=>{pointer=null;dragging=false;});
canvas.addEventListener('wheel',e=>{
  e.preventDefault();const p=mousePosition(e);zoom(e.deltaY<0?1.15:1/1.15,p.x,p.y);
},{passive:false});
mini.addEventListener('click',e=>{
  const r=mini.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W,y=(e.clientY-r.top)/r.height*H;
  camera.x=stage.clientWidth/2-x*camera.z;camera.y=stage.clientHeight/2-y*camera.z;
});
document.querySelectorAll('.mode').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
$('ratio').addEventListener('input',e=>{ratio=Number(e.target.value)/100;$('ratioLabel').textContent=e.target.value+'%';});
$('startBtn').onclick=begin;
$('againBtn').onclick=()=>{$('endOverlay').classList.add('hidden');$('startOverlay').classList.remove('hidden');state='menu';};
$('newBtn').onclick=()=>{$('startOverlay').classList.remove('hidden');$('endOverlay').classList.add('hidden');$('placement').classList.add('hidden');state='menu';};
$('pauseBtn').onclick=()=>{
  if(state!=='playing')return;
  paused=!paused;$('pauseBtn').textContent=paused?'▶ Fortsetzen':'Ⅱ Pause';
  $('gameStatus').textContent=paused?'PAUSIERT':'EROBERUNG LÄUFT';
};
$('speedBtn').onclick=()=>{speed=speed===1?2:1;$('speedBtn').textContent=speed+'×';};
$('fullBtn').onclick=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.();};
$('zoomIn').onclick=()=>zoom(1.28,stage.clientWidth/2,stage.clientHeight/2);
$('zoomOut').onclick=()=>zoom(1/1.28,stage.clientWidth/2,stage.clientHeight/2);
$('fitBtn').onclick=()=>{fitMap();$('zoomText').textContent='100%';};
document.addEventListener('keydown',e=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  keyboard[e.code]=true;
  if(e.repeat)return;
  if(e.code==='Digit1')setMode('attack');
  if(e.code==='Digit2')setMode('expand');
  if(e.code==='Digit3')setMode('fortify');
  if(e.code==='Space')$('pauseBtn').click();
  if(e.code==='KeyF')$('fullBtn').click();
  if(e.code==='Equal'||e.code==='NumpadAdd')$('zoomIn').click();
  if(e.code==='Minus'||e.code==='NumpadSubtract')$('zoomOut').click();
});
document.addEventListener('keyup',e=>{keyboard[e.code]=false;});
window.addEventListener('blur',()=>{keyboard=Object.create(null);});
window.addEventListener('resize',()=>{resize();});
resize();createWorld();state='menu';$('placement').classList.add('hidden');
requestAnimationFrame(t=>{lastUi=t;requestAnimationFrame(loop);});
})();