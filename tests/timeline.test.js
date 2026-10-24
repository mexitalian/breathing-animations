import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTimeline } from '../js/timeline.js';
import { normalize } from '../js/config.js';
import box from '../configs/box.js';
import resonance from '../configs/resonance.js';
import fourSevenEight from '../configs/478.js';
import sigh from '../configs/sigh.js';

const run = (raw, opts) => {
  const cfg = normalize(raw);
  const tl = createTimeline(cfg.sequence, opts);
  tl.start(0);
  return { cfg, tl };
};

const wimHofLike = {
  title: 'Test',
  sequence: {
    rounds: 2,
    steps: [
      { repeat: 3, counter: 'Breath', phases: [
        { name: 'In', dur: 1, scale: 1 },
        { name: 'Out', dur: 1, scale: 0.5 },
      ] },
      { name: 'Hold', dur: null, scale: 0.5, record: 'Retention', action: 'Breathe' },
      { name: 'Recover', dur: 2, scale: 1 },
    ],
  },
};

test('existing configs normalize to looping sequences', () => {
  for (const raw of [box, resonance, fourSevenEight, sigh]) {
    const cfg = normalize(raw);
    assert.equal(cfg.sequence.rounds, Infinity);
    assert.equal(cfg.sequence.steps.length, 1);
  }
  assert.deepEqual(normalize(box).components, ['track', 'glow', 'particles', 'core', 'dot']);
  assert.deepEqual(normalize(resonance).components, ['ring', 'ripple', 'glow', 'particles', 'core']);
  assert.deepEqual(normalize(fourSevenEight).components, ['ring', 'glow', 'particles', 'core']);
});

test('4-7-8 phases switch at the same times as before', () => {
  const { tl } = run(fourSevenEight);
  const at = (ms) => tl.tick(ms).phase.name;
  assert.equal(at(0), 'Inhale');
  assert.equal(at(3999), 'Inhale');
  assert.equal(at(4000), 'Hold');
  assert.equal(at(10999), 'Hold');
  assert.equal(at(11000), 'Exhale');
  assert.equal(at(19000), 'Inhale');
  assert.equal(at(19000 * 50 + 4500), 'Hold');
});

test('scale eases from the previous phase to the current one', () => {
  const { tl } = run(fourSevenEight);
  assert.equal(tl.tick(0).scale, 0.55);
  assert.ok(Math.abs(tl.tick(2000).scale - 0.775) < 1e-3, 'ease-in-out midpoint');
  assert.equal(tl.tick(5000).scale, 1);
  const end = tl.tick(18999).scale;
  assert.ok(end > 0.55 && end < 0.56);
});

test('countdown matches the old ceil(remaining) display', () => {
  const { tl } = run(box);
  assert.equal(Math.ceil(tl.tick(0).remaining / 1000), 4);
  assert.equal(Math.ceil(tl.tick(3500).remaining / 1000), 1);
});

test('counted breaths, open-ended hold, rounds and records', () => {
  const { tl } = run(wimHofLike);
  let s = tl.tick(0);
  assert.equal(s.phase.name, 'In');
  assert.equal(s.rep, 1);
  assert.equal(s.repeat, 3);
  assert.equal(s.round, 1);

  s = tl.tick(3500);
  assert.equal(s.rep, 2);
  assert.equal(s.phase.name, 'Out');

  s = tl.tick(6000);
  assert.equal(s.phase.name, 'Hold');
  assert.equal(s.openEnded, true);

  s = tl.tick(60000);
  assert.equal(s.phase.name, 'Hold', 'holds wait for a tap');
  assert.equal(s.elapsed, 54000);

  assert.equal(tl.advance(66000), true);
  s = tl.tick(66000);
  assert.equal(s.phase.name, 'Recover');
  assert.deepEqual(s.records, [{ label: 'Retention', round: 1, ms: 60000 }]);

  s = tl.tick(68000);
  assert.equal(s.round, 2);
  assert.equal(s.phase.name, 'In');
  assert.equal(s.rep, 1);

  assert.equal(tl.advance(68500), false, 'advance ignored on timed phases');

  tl.tick(74000);
  tl.advance(80000);
  s = tl.tick(82000);
  assert.equal(s.finished, true);
  assert.equal(s.records.length, 2);
  assert.equal(s.records[1].ms, 6000);
});

test('session timer ends after the breath in progress', () => {
  const { tl } = run(resonance, { sessionMs: 30000 });
  assert.equal(tl.tick(29000).finished, false);
  assert.equal(tl.tick(30500).finished, false, 'finishes the current breath');
  const s = tl.tick(36000);
  assert.equal(s.finished, true);
  assert.equal(s.sessionElapsed, 36000);
});

test('large frame gaps catch up without skipping counts', () => {
  const { tl } = run(box);
  const s = tl.tick(16000 * 3 + 9000);
  assert.equal(s.phase.name, 'Exhale');
  assert.equal(s.serial, 14);
});

test('invalid configs fail loudly', () => {
  assert.throws(() => normalize({ title: 'x', phases: [{ name: 'In', dur: 0, scale: 1 }] }), /dur > 0/);
  assert.throws(() => normalize({ title: 'x', shape: 'hexagon', phases: [{ name: 'In', dur: 1, scale: 1 }] }), /Unknown shape/);
});

test('forecast lists the phases ahead without moving the timeline', () => {
  const { tl } = run(box);
  tl.tick(5000); // 1 s into the first hold
  const { phases, ends } = tl.forecast(5000, { horizonMs: 20_000 });
  assert.deepEqual(phases.slice(0, 4).map(p => [p.phase.name, p.start, p.durMs]), [
    ['Hold', -1000, 4000],
    ['Exhale', 3000, 4000],
    ['Hold', 7000, 4000],
    ['Inhale', 11000, 4000],
  ]);
  assert.equal(phases.at(-1).start + phases.at(-1).durMs > 20_000, true, 'reaches the horizon');
  assert.equal(ends, false);
  assert.equal(tl.tick(5000).phase.name, 'Hold', 'real timeline untouched');
  assert.equal(tl.tick(5000).serial, 1);
});

test('forecast stops at an open-ended hold and at the session end', () => {
  const { tl } = run(wimHofLike);
  const held = tl.forecast(0);
  assert.equal(held.phases.length, 7, '3 breaths of 2 phases, then the hold');
  assert.equal(held.phases.at(-1).durMs, null);
  assert.equal(held.ends, false);

  const timed = createTimeline(normalize(box).sequence, { sessionMs: 30_000 });
  timed.start(0);
  const { phases, ends } = timed.forecast(0);
  assert.equal(ends, true);
  assert.equal(phases.at(-1).start + phases.at(-1).durMs, 32_000, 'finishes the breath under way');
});

test('forecast follows a pace change waiting for the next breath', () => {
  const { tl } = run(box);
  tl.tick(1000);
  tl.setDurationScale(0.5);
  const { phases } = tl.forecast(1000, { horizonMs: 30_000 });
  assert.deepEqual(phases.slice(0, 6).map(p => p.durMs), [4000, 4000, 4000, 4000, 2000, 2000]);
});
