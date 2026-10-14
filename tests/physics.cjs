const assert=require('node:assert/strict');
const Matter=require('../vendor/matter.min.js');
const physics=require('../physics.js');
const {createGame,RADII}=physics;
function tick(g,n=600){for(let i=0;i<n;i++)g.step();}
for(let level=0;level<10;level++){
 const g=createGame(Matter);const r=RADII[level];
 g.spawn(level,220-r+2,650-r);g.spawn(level,220+r-2,650-r);tick(g,3);
 assert.equal(g.fruits.length,1,`merge level ${level}`);assert.equal(g.fruits[0].fruitLevel,level+1);assert.equal(g.score,(level+2)*(level+3)/2);g.dispose();
}
{
 const g=createGame(Matter);g.spawn(0,200,620);g.spawn(1,235,620);tick(g);assert.equal(g.fruits.length,2,'different fruit must not merge');g.dispose();
}
{
 const g=createGame(Matter);for(let i=0;i<4;i++)g.spawn(0,202+(i%2)*35,596+Math.floor(i/2)*35);tick(g,1200);assert.equal(g.fruits.length,1,'four adjacent fruits chain merge');assert.equal(g.fruits[0].fruitLevel,2);assert.equal(g.score,12);g.dispose();
}
{
 const g=createGame(Matter);g.spawn(10,120,530);g.spawn(10,325,530);tick(g);assert.equal(g.fruits.length,2,'max fruit remains');assert.equal(g.score,0);g.dispose();
}
{
 const g=createGame(Matter);assert.equal(g.drop(0,-999),true);assert.equal(g.drop(0,999),false);tick(g);const f=g.fruits[0];assert.ok(f.position.x>=17&&f.position.y<=633,'walls and floor');assert.equal(g.over,false,'falling fruit grace');g.reset();assert.equal(g.fruits.length,0);assert.equal(g.score,0);assert.equal(g.ready,true);g.dispose();
}
{
 let ended=0;const g=createGame(Matter,{onEnd(){ended++}});const f=g.spawn(0,220,85);Matter.Body.setStatic(f,true);tick(g,470);assert.equal(g.over,true,'sustained overflow ends game');assert.equal(ended,1);assert.equal(g.drop(0,220),false);g.reset();assert.equal(g.over,false);assert.equal(g.drop(0,220),true);g.dispose();
}
{
 // Two supporting fruits merge inward, leaving sleeping fruit above their old edges unsupported.
 const g=createGame(Matter);
 g.spawn(8,137,565);g.spawn(8,303,565);
 const upper=g.spawn(0,137,462),top=g.spawn(1,137,419);
 Matter.Sleeping.set(upper,true);Matter.Sleeping.set(top,true);
 tick(g,1);assert.equal(g.score,55,'supporting fruit merged');
 assert.equal(upper.isSleeping,false,'merge must wake fruit whose support changed');
 assert.equal(top.isSleeping,false,'wake the rest of the sleeping stack too');
 tick(g,40);assert.ok(upper.position.y>464,'unsupported fruit must fall');g.dispose();
}
console.log('PASS: all merge levels, chains, bounds, game over, reset, and sleeping stack falling after support merges');

{
 assert.equal(typeof physics.createProgressStore,'function','progress store API must exist');
 const memory=new Map();
 const storage={getItem:key=>memory.has(key)?memory.get(key):null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};
 const store=physics.createProgressStore(storage);
 const saved={version:1,current:2,next:4,aim:173,board:{version:1,score:9,time:1250,cooldown:80,danger:0,fruits:[]}};
 assert.equal(store.save(saved),true,'valid progress is saved');
 assert.deepEqual(store.load(),saved,'saved progress round-trips');
 memory.set('watermelon-progress-v1','not-json');
 assert.equal(store.load(),null,'corrupt progress is ignored');
 assert.equal(memory.has('watermelon-progress-v1'),false,'corrupt progress is removed');
 store.save(saved);store.clear();assert.equal(store.load(),null,'restart clears saved progress');
}

{
 const game=createGame(Matter);const first=game.spawn(2,140,300),second=game.spawn(4,300,420);
 Matter.Body.setPosition(first,{x:141,y:301});Matter.Body.setVelocity(first,{x:1.5,y:-2});Matter.Body.setAngle(first,.25);Matter.Body.setAngularVelocity(first,.04);Matter.Sleeping.set(second,true);
 const state=game.snapshot();
 assert.equal(state.version,1);assert.equal(state.score,0);assert.equal(state.fruits.length,2);
 assert.deepEqual({...state.fruits[0],angularVelocity:undefined},{level:2,x:141,y:301,angle:.25,vx:1.5,vy:-2,angularVelocity:undefined,isSleeping:false,born:0});
 assert.ok(Math.abs(state.fruits[0].angularVelocity-.04)<1e-12);
 const restored=createGame(Matter);assert.equal(restored.restore(state),true,'valid board restores');
 assert.equal(restored.fruits.length,2);assert.equal(restored.fruits[0].fruitLevel,2);assert.equal(restored.fruits[0].position.x,141);assert.equal(restored.fruits[0].position.y,301);assert.equal(restored.fruits[1].isSleeping,false,'restored fruit rechecks its support before sleeping again');
 assert.equal(restored.restore({version:999,fruits:[]}),false,'unknown save version is rejected');
 game.dispose();restored.dispose();
}

console.log('PASS: progress storage, corruption recovery, board snapshot and restore');
