const assert = require('node:assert/strict');
const test = require('node:test');
const Matter = require('../vendor/matter.min.js');
const { createGame } = require('../physics.js');

function tick(game, count) {
  for (let i = 0; i < count; i += 1) game.step();
}

test('a naturally sleeping fruit falls when its support slowly rolls away', () => {
  const game = createGame(Matter);
  try {
    const support = game.spawn(2, 220, 618);
    Matter.Body.setAngle(support, Math.PI / 26);
    const upper = game.spawn(3, 220, 547);
    tick(game, 600);
    assert.equal(upper.isSleeping, true, 'fixture rests naturally before support moves');
    assert.ok(Matter.Collision.collides(upper, support), 'fixture initially has support');
    const startY = upper.position.y;
    support.sleepThreshold = 0;
    Matter.Sleeping.set(support, false);
    for (let i = 0; i < 4800; i += 1) {
      Matter.Body.setVelocity(support, { x: .08, y: 0 });
      game.step();
    }
    assert.equal(game.over, false);
    assert.ok(upper.position.y > startY + 30, 'fruit must fall without a new drop or merge');
    assert.ok(Math.abs(upper.bounds.max.y - 650) < 2, 'fruit reaches the floor');
  } finally {
    game.dispose();
  }
});

test('an unsupported sleeping group wakes even when its fruits touch each other', () => {
  const game = createGame(Matter);
  try {
    const lower = game.spawn(3, 220, 400);
    const upper = game.spawn(0, 220, 343);
    Matter.Sleeping.set(lower, true);
    Matter.Sleeping.set(upper, true);
    tick(game, 720);
    assert.ok(lower.position.y > 550, 'lower fruit falls');
    assert.ok(upper.position.y > 450, 'upper fruit falls with its unsupported group');
  } finally {
    game.dispose();
  }
});

test('a floor-supported bridge remains stable and can sleep', () => {
  const game = createGame(Matter);
  try {
    const left = game.spawn(7, 74, 489);
    game.spawn(8, 209, 574);
    game.spawn(7, 365, 590);
    tick(game, 1200);
    const start = { ...left.position };
    tick(game, 1200);
    assert.equal(left.isSleeping, true, 'supported fruit retains sleeping optimization');
    assert.ok(Math.hypot(left.position.x - start.x, left.position.y - start.y) < 1);
    assert.ok(left.position.y < 520, 'a real bridge is not pulled through its support');
  } finally {
    game.dispose();
  }
});

test('restoring an old save with a floating sleeping fruit resumes gravity', () => {
  const old = createGame(Matter);
  const restored = createGame(Matter);
  try {
    const fruit = old.spawn(3, 327, 318);
    Matter.Sleeping.set(fruit, true);
    const save = old.snapshot();
    save.score = 2317;
    assert.equal(restored.restore(save), true);
    tick(restored, 720);
    assert.equal(restored.score, 2317, 'fix does not reset saved scores');
    assert.ok(restored.fruits[0].position.y > 600, 'saved floating fruit falls after restoration');
  } finally {
    old.dispose();
    restored.dispose();
  }
});

test('a save taken in a merge callback contains the completed wake-up', () => {
  let save;
  const game = createGame(Matter, { onMerge() { save = game.snapshot(); } });
  try {
    game.spawn(8, 137, 565);
    game.spawn(8, 303, 565);
    const upper = game.spawn(0, 137, 462);
    const top = game.spawn(1, 137, 419);
    Matter.Sleeping.set(upper, true);
    Matter.Sleeping.set(top, true);
    tick(game, 1);
    assert.ok(save);
    assert.equal(save.score, 55);
    assert.ok(save.fruits.every(fruit => !fruit.isSleeping), 'callbacks must not save stale sleepers');
  } finally {
    game.dispose();
  }
});
