// detector.js - pure jump detection from 33-pose-landmark frames (no DOM, Node-testable)
import { TUNING } from './tuning.js';

const IDX = { LS: 11, RS: 12, LH: 23, RH: 24, LA: 27, RA: 28, LHE: 29, RHE: 30 };

function visOf(l) { if (!l) return 0; const v = l.visibility; return (v === undefined) ? 1 : v; }
function yOf(l) { return l ? l.y : 1; }
function xOf(l) { return l ? l.x : 0; }

export class JumpDetector {
  constructor(tuning) {
    this.t = Object.assign({}, TUNING, tuning || {});
    this.reset();
  }
  reset() {
    this.state = 'ground';
    this.baseline = null;
    this.samples = [];
    this.groundedSince = 0;
    this.airStart = 0;
    this.minAirY = 1;
    this.takeoffBase = 0;
    this.lastSeen = 0;
  }
  _lost(tMs) {
    this.state = 'ground';
    this.baseline = null;
    this.samples = [];
    this.groundedSince = tMs;
  }
  update(lm, tMs) {
    const events = [];
    if (!lm || !lm.length) {
      // short-gap tolerance: video frames can be stale for a few rAF ticks
      if (this.state === 'ground' && this.lastSeen && (tMs - this.lastSeen) < this.t.gapToleranceMs) {
        return { tracking: true, airborne: false, groundedForMs: tMs - this.groundedSince, events };
      }
      this._lost(tMs);
      return { tracking: false, airborne: false, groundedForMs: 0, events };
    }
    const vMin = Math.min(visOf(lm[IDX.LA]), visOf(lm[IDX.RA]));
    if (vMin < this.t.visGate) {
      this._lost(tMs);
      return { tracking: false, airborne: false, groundedForMs: 0, events };
    }
    const ankleY = (yOf(lm[IDX.LA]) + yOf(lm[IDX.RA]) + yOf(lm[IDX.LHE]) + yOf(lm[IDX.RHE])) / 4;
    const shY = (yOf(lm[IDX.LS]) + yOf(lm[IDX.RS])) / 2;
    const hipY = (yOf(lm[IDX.LH]) + yOf(lm[IDX.RH])) / 2;
    const shW = Math.abs(xOf(lm[IDX.LS]) - xOf(lm[IDX.RS]));
    // screen Y grows downward: standing upright means hips are BELOW shoulders
    const upright = (hipY - shY) >= this.t.torsoRatio * Math.max(shW, 0.04);

    if (this.state === 'ground') {
      this.samples.push([tMs, ankleY]);
      const cut = tMs - this.t.baselineWindowMs;
      while (this.samples.length > 2 && this.samples[0][0] < cut) this.samples.shift();
      // baseline = HIGHEST y in window (standing ground level, screen-down coords).
      // Using max (not median) makes the baseline immune to the player's own
      // descent samples when jumps come close together - the median would be
      // dragged down and the next takeoff would never cross the threshold.
      let m = -Infinity;
      for (const s of this.samples) if (s[1] > m) m = s[1];
      this.baseline = m;
    }
    const base = (this.baseline !== null) ? this.baseline : ankleY;
    let airborne = (this.state === 'air');

    if (this.state === 'ground') {
      if (upright && ankleY < base - this.t.jumpAmp) {
        this.state = 'air';
        this.airStart = tMs;
        this.minAirY = ankleY;
        this.takeoffBase = base;
        this.samples = [];
        this.baseline = null;
        events.push({ type: 'takeoff', t: tMs });
        airborne = true;
      }
    } else {
      if (ankleY < this.minAirY) this.minAirY = ankleY;
      const down = ankleY > (this.takeoffBase - this.t.groundEps);
      if (down || (tMs - this.airStart) > 1200) {
        const amp = this.takeoffBase - this.minAirY;
        const dur = tMs - this.airStart;
        this.state = 'ground';
        this.groundedSince = tMs;
        this.samples = [];
        this.baseline = null;
        events.push({ type: 'landing', t: tMs, amp, dur });
        airborne = false;
      }
    }
    this.lastSeen = tMs;
    return {
      tracking: true,
      airborne,
      groundedForMs: (this.state === 'ground') ? (tMs - this.groundedSince) : 0,
      events
    };
  }
}
