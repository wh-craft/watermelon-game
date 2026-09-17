(() => {
  'use strict';
  const $=id=>document.getElementById(id),canvas=$('board'),ctx=canvas.getContext('2d');
  const pixelRatio=Math.min(window.devicePixelRatio||1,2);
  canvas.width=440*pixelRatio;canvas.height=680*pixelRatio;ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  const names=['葡萄','樱桃','橘子','柠檬','猕猴桃','番茄','桃子','菠萝','椰子','半个西瓜','大西瓜'];
  const colors=['#944090','#ef3454','#ffa022','#f6dd38','#84c73e','#f96776','#efb064','#f6d957','#ded7bf','#f4788d','#69bc42'];
  let images=[],game,progressStore,aim=220,current=0,next=1,ready=false,paused=false,best=0,particles=[],popups=[],last=0,accumulator=0,toastUntil=0,nextAutosave=0,audio=null,sound=false,dragging=null;
  try{best=Number(localStorage.getItem('watermelon-best'))||0}catch{}$('best').textContent=best;
  function randomFruit(){const roll=Math.random();return roll<.32?0:roll<.6?1:roll<.82?2:roll<.95?3:4;}
  function beep(level){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(350+level*65,audio.currentTime);o.frequency.exponentialRampToValueAtTime(650+level*95,audio.currentTime+.12);g.gain.setValueAtTime(.06,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.2);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.21);}catch{}}
  function updateNext(){ $('next').src=images[next].src;$('next').alt=`下一颗：${names[next]}`; }
  function notify(text){$('toast').textContent=text;$('toast').classList.add('visible');toastUntil=performance.now()+2100;}
  function saveProgress(){if(!ready||!game||game.over||!game.fruits.length){if(game?.over)progressStore?.clear();return}progressStore?.save({version:1,current,next,aim,board:game.snapshot()});}
  function restoreProgress(){
    const saved=progressStore?.load();if(!saved)return false;
    if(!game.restore(saved.board)){progressStore.clear();return false}
    current=saved.current;next=saved.next;aim=Math.max(0,Math.min(440,saved.aim));particles=[];popups=[];paused=false;
    $('score').textContent=game.score;$('end').hidden=true;$('confirm').hidden=true;$('hint').classList.toggle('used',game.fruits.length>0);$('status').textContent='已恢复上次游戏进度';updateNext();notify('已恢复上次进度');return true;
  }
  function reset(){progressStore?.clear();game.reset();current=randomFruit();next=randomFruit();aim=220;particles=[];popups=[];$('score').textContent='0';$('end').hidden=true;$('confirm').hidden=true;$('hint').classList.remove('used');$('status').textContent='相同水果碰一碰，变大一点点';paused=false;updateNext();canvas.focus({preventScroll:true});}
  function drop(){if(!ready||paused||game.over)return;if(game.drop(current,aim)){beep(0);current=next;next=randomFruit();updateNext();$('hint').classList.add('used');saveProgress();}}
  function setAim(clientX){const rect=canvas.getBoundingClientRect();aim=Math.max(0,Math.min(440,(clientX-rect.left)*440/rect.width));}
  canvas.addEventListener('pointerdown',e=>{if(!ready||paused||game.over||dragging!==null)return;dragging=e.pointerId;setAim(e.clientX);canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});});
  canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||dragging===e.pointerId)setAim(e.clientX);});
  canvas.addEventListener('pointerup',e=>{if(dragging!==e.pointerId)return;setAim(e.clientX);dragging=null;drop();});
  canvas.addEventListener('pointercancel',()=>{dragging=null});
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight',' ','ArrowDown','Enter'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')aim=Math.max(0,aim-15);else if(e.key==='ArrowRight')aim=Math.min(440,aim+15);else if(!e.repeat)drop();}});
  $('sound').onclick=()=>{sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'关闭音效':'开启音效');$('sound').title=sound?'关闭音效':'开启音效';document.querySelector('.sound-slash').hidden=sound;if(sound)beep(2);};
  $('restart').onclick=()=>{if(!ready)return;if(game.over||game.fruits.length===0){reset();return;}paused=true;$('confirm').hidden=false;$('confirm-restart').focus();};
  $('cancel').onclick=()=>{paused=false;$('confirm').hidden=true;canvas.focus({preventScroll:true});};
  $('confirm-restart').onclick=reset;$('again').onclick=reset;$('reload').onclick=()=>location.reload();
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('confirm').hidden)$('cancel').click();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)saveProgress();last=0;accumulator=0;});
  window.addEventListener('pagehide',saveProgress);
  window.addEventListener('beforeunload',saveProgress);
  function fruit(level,x,y,angle=0,scale=1){const r=WatermelonPhysics.RADII[level];ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(images[level],-r*scale,-r*scale,r*2*scale,r*2*scale);ctx.restore();}
  function render(now){
    if(!ready)return;
    ctx.clearRect(0,0,440,680);
    ctx.fillStyle='#fff2c7';ctx.fillRect(0,0,440,680);
    ctx.fillStyle='#e6b965';ctx.fillRect(0,650,440,30);ctx.fillStyle='#f6d58d';ctx.fillRect(0,650,440,6);
    const danger=game.danger>0;
    ctx.save();ctx.setLineDash([7,7]);ctx.strokeStyle=danger?'#e25e45':'#d4b37d88';ctx.lineWidth=danger?2:1;ctx.beginPath();ctx.moveTo(9,100);ctx.lineTo(431,100);ctx.stroke();ctx.restore();
    if(danger){ctx.fillStyle='#c45738';ctx.font='15px system-ui';ctx.textAlign='center';ctx.fillText(`快满了！${Math.max(1,Math.ceil((2000-game.danger)/1000))}`,220,124);}
    for(const f of game.fruits){const age=game.time-f.born;fruit(f.fruitLevel,f.position.x,f.position.y,f.angle,age<160?1+.07*Math.sin(age/160*Math.PI):1);}
    if(!game.over){const r=WatermelonPhysics.RADII[current],x=Math.max(r+1,Math.min(439-r,aim));let landing=650-r;for(const f of game.fruits){const sum=r+WatermelonPhysics.RADII[f.fruitLevel],dx=x-f.position.x;if(Math.abs(dx)<sum){landing=Math.min(landing,f.position.y-Math.sqrt(sum*sum-dx*dx));}}ctx.save();ctx.globalAlpha=game.ready?1:.35;ctx.setLineDash([4,7]);ctx.strokeStyle='#bd995a77';ctx.beginPath();ctx.moveTo(x,44+r+8);ctx.lineTo(x,Math.max(44+r+8,landing));ctx.stroke();fruit(current,x,44);ctx.restore();}
    for(const p of particles){const age=(now-p.start)/550;if(age>=1)continue;ctx.globalAlpha=1-age;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x+p.vx*age,p.y+p.vy*age+55*age*age,p.r*(1-age),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;particles=particles.filter(p=>now-p.start<550);
    ctx.textAlign='center';ctx.font='bold 23px system-ui';for(const p of popups){const age=(now-p.start)/700;ctx.globalAlpha=Math.max(0,1-age);ctx.fillStyle='#bc6c22';ctx.fillText('+'+p.points,p.x,p.y-age*45);}ctx.globalAlpha=1;popups=popups.filter(p=>now-p.start<700);
    if(now>toastUntil)$('toast').classList.remove('visible');
  }
  function frame(now){if(!last)last=now;const elapsed=Math.min(now-last,50);last=now;if(ready&&!paused&&!document.hidden){accumulator+=elapsed;while(accumulator>=1000/120){game.step(1000/120);accumulator-=1000/120;}if(now>=nextAutosave){saveProgress();nextAutosave=now+1000}}else accumulator=0;render(now);requestAnimationFrame(frame);}
  async function start(){try{
    if(!window.Matter)throw Error('物理引擎加载失败');
    images=await Promise.all(names.map((_,i)=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('水果图片加载失败'));im.src=`assets/classic/${i+1}.png`;})));
    const chain=$('fruit-chain');images.forEach((im,i)=>{const el=im.cloneNode();el.alt=names[i];el.title=names[i];chain.append(el);});
    game=WatermelonPhysics.createGame(Matter,{onMerge({x,y,level,score}){const now=performance.now();$('score').textContent=score;if(score>best){best=score;$('best').textContent=best;try{localStorage.setItem('watermelon-best',String(best))}catch{}}for(let i=0;i<12;i++)particles.push({x,y,vx:(Math.random()-.5)*150,vy:(Math.random()-.7)*150,r:3+Math.random()*4,color:colors[level],start:now});popups.push({x,y,points:(level+1)*(level+2)/2,start:now});beep(level);if(level===10){notify('合成大西瓜啦！');$('status').textContent='大西瓜到手！继续挑战更高分';}else if(level>=7)notify(`合成${names[level]}！`);saveProgress();},onEnd(score){progressStore?.clear();$('final-score').textContent=score;$('end').hidden=false;$('again').focus();}});
    let storage=null;try{storage=localStorage}catch{}progressStore=WatermelonPhysics.createProgressStore(storage);
    ready=true;if(!restoreProgress())reset();$('loading').hidden=true;requestAnimationFrame(frame);
  }catch(error){$('loading').querySelector('h2').textContent='加载遇到了点问题';$('load-message').textContent=error.message+'，请重新加载';$('reload').hidden=false;}}
  start();
})();
