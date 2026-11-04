// sim_source.js - synthetic 33-landmark player that scripts jumps WITHOUT a camera.
// Pure logic (no DOM) - used by browser "test mode" and by the Node QA suite.
// Script per 10 rope revolutions: 8 clearing jumps + 1 wasted-then-clear + 1 skip (trip).
// Also simulates walking away from the camera between t=20s and t=22.5s.
// Mirrors RopeGame timing rules (grace + freeze + speed) so rope and player stay in sync.
import { TUNING } from './tuning.js';

// [x, y] layout of a standing person, normalized coords (33 MediaPipe landmarks)
const BASE = [
  [0.500, 0.318], [0.493, 0.305], [0.485, 0.303], [0.478, 0.306], [0.507, 0.305],
  [0.515, 0.303], [0.522, 0.306], [0.472, 0.318], [0.528, 0.318], [0.490, 0.348],
  [0.510, 0.348],
  [0.420, 0.430], [0.580, 0.430],            // 11/12 shoulders
  [0.385, 0.545], [0.615, 0.545],            // 13/14 elbows
  [0.400, 0.660], [0.600, 0.660],            // 15/16 wrists
  [0.395, 0.690], [0.605, 0.690], [0.390, 0.700], [0.610, 0.700],
  [0.395, 0.695], [0.605, 0.695],            // 17-22 hands
  [0.455, 0.620], [0.545, 0.620],            // 23/24 hips
  [0.450, 0.750], [0.550, 0.750],            // 25/26 knees
  [0.445, 0.875], [0.555, 0.875],            // 27/28 ankles
  [0.448, 0.895], [0.552, 0.895],            // 29/30 heels
  [0.435, 0.915], [0.565, 0.915]             // 31/32 foot index
];

export function makePose(ankleDy, ts, tracking) {
  const out = [];
  for (let i = 0; i < 33; i++) {
    if (!tracking) { out.push({ x: 0.5, y: 1.5, z: 0, visibility: 0.02 }); continue; }
    let x = BASE[i][0], y = BASE[i][1];
    let f = 0;
    if (i === 23 || i === 24) f = 0.15;       // hips rise a bit
    else if (i === 25 || i === 26) f = 0.55;  // knees fold
    else if (i >= 27) f = 1.0;                // feet fully leave ground
    y += ankleDy * f;
    y += 0.0015 * Math.sin(ts * 0.021 + i * 1.7);
    out.push({ x, y, z: 0, visibility: 0.95 });
  }
  return out;
}

export class SimPoseSource {
  constructor() { this.started = false; }
  start(baseMs) {
    this.last = baseMs || 0;
    this.t = 0;                     // wall clock since round start
    this.prevPhase = 0;             // last rope phase received from the game
    this.modeIdx = 0;
    this.mode = 'jump';             // 'jump' | 'double' | 'skip'
    this.jump = null;               // active arc {start, dur, amp}
    this.waitTakeoff = null;
    this.stats = { jumps: 0, wasted: 0, trips: 0 };
    this.started = true;
  }
  _nextMode() {
    this.modeIdx++;
    const p = this.modeIdx % 10;
    this.mode = (p < 8) ? 'jump' : (p === 8 ? 'double' : 'skip');
  }
  // phase & speed come from RopeGame (single source of truth; no sim-side rope clock,
  // so trips/freezes/speed-ups/pauses can never drift out of sync)
  next(tMs, phase, speed) {
    const dt = Math.max(0, tMs - this.last);
    this.last = tMs;
    this.t += dt;
    const tracking = !(this.t >= 20000 && this.t < 22500);  // walk-away window
    if (!tracking) {
      return { ts: tMs, tracking: false, landmarks: makePose(0, this.t, false) };
    }
    const ph = (phase === undefined) ? this.prevPhase : phase;
    const sp = (speed === undefined) ? TUNING.ropeStartSpeed : speed;
    const crossed = (this.prevPhase < 0.5 && ph >= 0.5);
    this.prevPhase = ph;
    if (crossed) {
      if (this.mode === 'skip') this.stats.trips++;
      this._nextMode();
      if (this.mode === 'double') this.waitTakeoff = this.t + 150;
    }
    let dy = 0;
    if (this.jump) {
      const u = (this.t - this.jump.start) / this.jump.dur;
      if (u >= 1) this.jump = null;
      else if (u >= 0) dy = -this.jump.amp * 4 * u * (1 - u);
    }
    if (!this.jump && this.mode !== 'skip') {
      if (this.mode === 'double' && this.waitTakeoff !== null) {
        if (this.t >= this.waitTakeoff) {
          this.jump = { start: this.t, dur: 520, amp: 0.07 };   // out-of-sync jump
          this.waitTakeoff = null;
          this.stats.wasted++;
        }
      } else {
        const toCross = ((0.5 - ph + 1) % 1) / sp * 1000;
        if (toCross <= 280) {                                    // clearing jump
          this.jump = { start: this.t, dur: 620, amp: 0.08 };
          this.stats.jumps++;
        }
      }
    }
    return { ts: tMs, tracking: true, landmarks: makePose(dy, this.t, true) };
  }
}
