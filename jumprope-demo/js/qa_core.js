// qa_core.js - headless automated tests (shared by Node runner and the browser button)
import { TUNING } from './tuning.js';
import { JumpDetector } from './detector.js';
import { RopeGame } from './game_core.js';
import { SimPoseSource, makePose } from './sim_source.js';

export function runQA() {
  const R = [];
  const dt = 1000 / 30;
  const add = (name, pass, detail) => R.push({ name, pass: !!pass, detail: detail || '' });

  // 1) rope phase model: first bottom crossing at ~625ms for 0.8 rev/s
  {
    const g = new RopeGame();
    let t = 0, crossedAt = null;
    while (t < 2000) {
      const r = g.update(dt, true, t, { airborne: false, groundedForMs: 9999 });
      if (r.crossed && crossedAt === null) crossedAt = t;
      t += dt;
    }
    const expected = 500 / TUNING.ropeStartSpeed;
    // update() reports the frame START time; the true crossing (expected) lies within that frame
    add('rope: first bottom crossing ~' + expected + 'ms',
      crossedAt !== null && crossedAt > (expected - dt - 1) && crossedAt <= (expected + 1),
      'crossedAt=' + crossedAt);
  }

  // 2) never jumping must produce trips
  {
    const g = new RopeGame();
    let t = 0, trips = 0, firstTripAt = null;
    while (t < 5000) {
      const r = g.update(dt, true, t, { airborne: false, groundedForMs: 9999 });
      if (r.trip) { trips++; if (firstTripAt === null) firstTripAt = t; }
      if (r.gameOver) break;
      t += dt;
    }
    add('trip: grounded player gets tripped', trips >= 1,
      'trips=' + trips + ' firstAt=' + firstTripAt + ' (expect ~' + (625 + TUNING.bottomGraceMs) + ')');
  }

  // 3) detector unit test on one scripted jump
  {
    const det = new JumpDetector();
    const ev = [];
    let t = 0;
    for (; t < 1000; t += dt) {
      const d = det.update(makePose(0, t, true), t);
      ev.push(...d.events);
    }
    for (let u = 0; u <= 600; u += dt) {
      const frac = u / 600;
      const dy = -0.08 * 4 * frac * (1 - frac);
      const d = det.update(makePose(dy, 1000 + u, true), 1000 + u);
      ev.push(...d.events);
    }
    for (let u2 = 0; u2 < 600; u2 += dt) {
      const d = det.update(makePose(0, 1600 + u2, true), 1600 + u2);
      ev.push(...d.events);
    }
    const takeoffs = ev.filter(e => e.type === 'takeoff').length;
    const landing = ev.find(e => e.type === 'landing');
    add('detector: exactly one takeoff+landing', takeoffs === 1 && !!landing,
      'events=' + JSON.stringify(ev.map(e => e.type)));
    if (landing) {
      add('detector: amplitude & duration plausible',
        Math.abs(landing.amp - 0.08) < 0.02 && landing.dur > 350 && landing.dur < 650,
        'amp=' + landing.amp.toFixed(3) + ' dur=' + Math.round(landing.dur));
    }
  }

  // 4) full 60s simulated round, default lives -> game over after exactly 3 trips
  {
    const det = new JumpDetector();
    const game = new RopeGame();
    const sim = new SimPoseSource();
    sim.start(0);
    let t = 0, trips = 0, gameOver = false;
    let pauseEvents = 0;
    let tripsAfterResume = 0;
    const pausePhases = [];
    while (t < TUNING.roundMs && !game.over) {
      const scoredBefore = game.stats.scored;
      const fr = sim.next(t, game.phase, game.speed);
      const d = det.update(fr.landmarks, fr.ts);
      for (const e of d.events) {
        if (e.type === 'landing') game.feed(e);
      }
      const r = game.update(dt, d.tracking, t, { airborne: d.airborne, groundedForMs: d.groundedForMs });
      if (t >= 20000 && t < 22500) {
        pausePhases.push(game.phase);
        if (r.trip || game.stats.scored > scoredBefore) pauseEvents++;
      }
      if (r.trip) {
        trips++;
        if (t >= 22500 && t < 23300) tripsAfterResume++;
      }
      if (r.gameOver) gameOver = true;
      t += dt;
    }
    add('sim: game over after exactly 3 trips', gameOver && trips === TUNING.lives,
      'trips=' + trips + ' scored=' + game.stats.scored);
    add('sim: plenty of scored jumps', game.stats.scored >= 15,
      'scored=' + game.stats.scored + ' (sim scheduled ' + sim.stats.jumps + ')');
    add('sim: wasted jumps detected', game.stats.wasted >= 2,
      'wasted=' + game.stats.wasted + ' (sim scheduled ' + sim.stats.wasted + ')');
    add('sim: rope frozen while player away', new Set(pausePhases).size <= 1,
      'distinctPhases=' + new Set(pausePhases).size);
    add('sim: no trip/score while away', pauseEvents === 0, 'pauseEvents=' + pauseEvents);
    add('sim: no instant trip after return', tripsAfterResume === 0, 'tripsIn[22500,23300)=' + tripsAfterResume);
  }

  // 5) long run with extra lives - stability incl. rope speed-ups
  {
    const det = new JumpDetector();
    const game = new RopeGame();
    game.lives = 999;
    const sim = new SimPoseSource();
    sim.start(0);
    let t = 0;
    while (t < TUNING.roundMs && !game.over) {
      const fr = sim.next(t, game.phase, game.speed);
      const d = det.update(fr.landmarks, fr.ts);
      for (const e of d.events) {
        if (e.type === 'landing') game.feed(e);
      }
      game.update(dt, d.tracking, t, { airborne: d.airborne, groundedForMs: d.groundedForMs });
      t += dt;
    }
    add('sim: long run stable with speed-ups',
      game.stats.scored >= 20 && game.stats.trips >= 3 && game.speed > TUNING.ropeStartSpeed,
      'scored=' + game.stats.scored + ' trips=' + game.stats.trips +
      ' wasted=' + game.stats.wasted + ' speed=' + game.speed.toFixed(2));
  }
  return R;
}
