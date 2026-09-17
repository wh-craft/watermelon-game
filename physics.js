/* Game rules are independent of rendering, so collisions can be verified headlessly. */
(function(root){
  'use strict';
  const RADII=[18,25,32,39,46,55,64,74,85,99,116];
  const PROGRESS_KEY='watermelon-progress-v1';
  const finite=value=>Number.isFinite(value);
  function createProgressStore(storage){
    const valid=state=>state&&state.version===1&&Number.isInteger(state.current)&&state.current>=0&&state.current<=4&&Number.isInteger(state.next)&&state.next>=0&&state.next<=4&&finite(state.aim)&&state.board&&typeof state.board==='object';
    const clear=()=>{try{storage?.removeItem(PROGRESS_KEY)}catch{}};
    return {
      save(state){if(!valid(state))return false;try{storage?.setItem(PROGRESS_KEY,JSON.stringify(state));return !!storage}catch{return false}},
      load(){try{const raw=storage?.getItem(PROGRESS_KEY);if(!raw)return null;const state=JSON.parse(raw);if(valid(state))return state;clear();return null}catch{clear();return null}},
      clear
    };
  }
  function createGame(Matter,callbacks={}){
    const {Engine,Bodies,Body,Composite,Events,Sleeping}=Matter;
    const engine=Engine.create({positionIterations:10,velocityIterations:8,enableSleeping:true});
    engine.gravity.y=1.4;
    let fruits=[],pending=[],score=0,time=0,cooldown=0,over=false,danger=0;
    const walls=[Bodies.rectangle(-30,340,60,1400,{isStatic:true,friction:.4}),Bodies.rectangle(470,340,60,1400,{isStatic:true,friction:.4}),Bodies.rectangle(220,680,560,60,{isStatic:true,friction:.5})];
    Composite.add(engine.world,walls);
    function spawn(level,x,y=44){
      const radius=RADII[level];
      const body=Bodies.circle(Math.max(radius+1,Math.min(439-radius,x)),y,radius,{restitution:.16,friction:.35,frictionStatic:.65,frictionAir:.006,density:.002,sleepThreshold:70});
      body.fruitLevel=level;body.born=time;body.merging=false;
      fruits.push(body);Composite.add(engine.world,body);return body;
    }
    function collide(event){
      for(const {bodyA:a,bodyB:b} of event.pairs){
        if(a.fruitLevel===undefined||b.fruitLevel===undefined)continue;
        if(a.fruitLevel===b.fruitLevel&&a.fruitLevel<10&&!a.merging&&!b.merging){a.merging=b.merging=true;pending.push([a,b]);}
      }
    }
    Events.on(engine,'collisionStart',collide);Events.on(engine,'collisionActive',collide);
    function step(dt=1000/120){
      if(over)return;
      time+=dt;cooldown=Math.max(0,cooldown-dt);Engine.update(engine,dt);
      for(const [a,b] of pending){
        if(!fruits.includes(a)||!fruits.includes(b))continue;
        const level=a.fruitLevel+1,x=(a.position.x+b.position.x)/2,y=Math.min(650-RADII[level],(a.position.y+b.position.y)/2);
        Composite.remove(engine.world,[a,b]);fruits=fruits.filter(f=>f!==a&&f!==b);
        const merged=spawn(level,x,y);Body.setVelocity(merged,{x:(a.velocity.x+b.velocity.x)*.3,y:Math.min(0,(a.velocity.y+b.velocity.y)*.2)});
        score+=(level+1)*(level+2)/2;
        callbacks.onMerge?.({x:merged.position.x,y,level,score});
      }
      // Removing supports does not automatically wake sleeping bodies in Matter.js.
      // Wake the whole stack once per merge batch so support changes propagate upward.
      if(pending.length)for(const fruit of fruits)Sleeping.set(fruit,false);
      pending=[];
      const high=fruits.some(f=>time-f.born>1800&&f.position.y-RADII[f.fruitLevel]<100&&(f.isSleeping||f.speed<1.2));
      danger=high?danger+dt:0;
      if(danger>=2000){over=true;callbacks.onEnd?.(score);}
    }
    function reset(){Composite.clear(engine.world,false);Engine.clear(engine);Composite.add(engine.world,walls);fruits=[];pending=[];score=time=cooldown=danger=0;over=false}
    function snapshot(){
      return {version:1,score,time,cooldown,danger,fruits:fruits.map(f=>({level:f.fruitLevel,x:f.position.x,y:f.position.y,angle:f.angle,vx:f.velocity.x,vy:f.velocity.y,angularVelocity:f.angularVelocity,isSleeping:f.isSleeping,born:f.born}))};
    }
    function restore(state){
      const validFruit=f=>f&&Number.isInteger(f.level)&&f.level>=0&&f.level<=10&&[f.x,f.y,f.angle,f.vx,f.vy,f.angularVelocity,f.born].every(finite)&&typeof f.isSleeping==='boolean';
      if(!state||state.version!==1||!finite(state.score)||state.score<0||!finite(state.time)||state.time<0||!finite(state.cooldown)||state.cooldown<0||!finite(state.danger)||state.danger<0||!Array.isArray(state.fruits)||state.fruits.length>200||!state.fruits.every(validFruit))return false;
      reset();score=state.score;time=state.time;cooldown=state.cooldown;danger=state.danger;
      for(const saved of state.fruits){
        const body=spawn(saved.level,saved.x,saved.y);Body.setPosition(body,{x:saved.x,y:saved.y});Body.setVelocity(body,{x:saved.vx,y:saved.vy});Body.setAngle(body,saved.angle);Body.setAngularVelocity(body,saved.angularVelocity);body.born=saved.born;Sleeping.set(body,saved.isSleeping);
      }
      return true;
    }
    return {engine,spawn,step,snapshot,restore,get fruits(){return fruits},get score(){return score},get over(){return over},get time(){return time},get danger(){return danger},get ready(){return !over&&cooldown===0},drop(level,x){if(!this.ready)return false;spawn(level,x);cooldown=500;return true},reset,dispose(){Events.off(engine);Engine.clear(engine)}};
  }
  root.WatermelonPhysics={createGame,createProgressStore,RADII};
  if(typeof module!=='undefined')module.exports=root.WatermelonPhysics;
})(typeof globalThis!=='undefined'?globalThis:this);
