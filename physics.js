/* Game rules are independent of rendering, so collisions can be verified headlessly. */
(function(root){
  'use strict';
  const RADII=[18,25,32,39,46,55,64,74,85,99,116];
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
    return {engine,spawn,step,get fruits(){return fruits},get score(){return score},get over(){return over},get time(){return time},get danger(){return danger},get ready(){return !over&&cooldown===0},drop(level,x){if(!this.ready)return false;spawn(level,x);cooldown=500;return true},reset(){Composite.clear(engine.world,false);Engine.clear(engine);Composite.add(engine.world,walls);fruits=[];pending=[];score=time=cooldown=danger=0;over=false},dispose(){Events.off(engine);Engine.clear(engine)}};
  }
  root.WatermelonPhysics={createGame,RADII};
  if(typeof module!=='undefined')module.exports=root.WatermelonPhysics;
})(typeof globalThis!=='undefined'?globalThis:this);
