// game_core.js - virtual rope phase model + trip judging + scoring (no DOM, Node-testable)
import { TUNING } from './tuning.js';

export class RopeGame {
  constructor(tuning) {
    this.t = Object.assign({}, TUNING, tuning || {});
    this.reset();
  }
  reset() {
    this.phase = 0;                 // 0 = rope at top, 0.5 = rope at feet
    this.speed = this.t.ropeStartSpeed;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.jumps = 0;
    this.lives = this.t.lives;
    this.now = 0;
    this.freezeUntil = 0;
    this.invulUntil = 0;
    this.bottomDuringAir = false;
    this.pending = [];              // trip judgment timestamps (crossing + grace)
    this.airborne = false;
    this.groundedForMs = 9999;
    this.over = false;
    this.lastWastedAt = -1e9;
    this.lostTracking = false;
    this.stats = { scored: 0, trips: 0, wasted: 0 };
  }
  // feed landing events from JumpDetector; returns null | {type:'score'|'wasted', ...}
  feed(ev) {
    if (this.over || !ev || ev.type !== 'landing') return null;
    this.airborne = false;
    const good = (ev.amp >= this.t.jumpAmp) && (ev.dur <= this.t.jumpMaxMs);
    if (good && this.bottomDuringAir) {
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.jumps++;
      this.score += this.combo;
      this.stats.scored++;
      let speedUp = false;
      if (this.jumps % this.t.speedUpEvery === 0) {
        this.speed = Math.min(this.t.ropeSpeedMax, this.speed + this.t.ropeSpeedStep);
        speedUp = true;
      }
      this.bottomDuringAir = false;
      return { type: 'score', combo: this.combo, speedUp };
    }
    if (good) {
      this.stats.wasted++;
      const hint = (this.now - this.lastWastedAt) >= this.t.wastedCooldownMs;
      if (hint) this.lastWastedAt = this.now;
      this.bottomDuringAir = false;
      return { type: 'wasted', hint };
    }
    this.bottomDuringAir = false;   // tiny hop: ignored silently
    return null;
  }
  // advance one frame; body = {airborne, groundedForMs} from detector
  update(dtMs, tracking, nowMs, body) {
    const res = { crossed: false, trip: false, gameOver: false };
    if (this.over) return res;
    this.now = nowMs;
    if (!tracking) {
      this.lostTracking = true;    // rope & judgments frozen (no false trips)
      return res;
    }
    if (this.lostTracking) {
      // tracking just restored after a real loss: restart the rope from the top
      // so the returning player can never be tripped "instantly" (fairness rule)
      this.lostTracking = false;
      this.phase = 0;
      this.pending = [];
    }
    if (body) {
      this.airborne = !!body.airborne;
      this.groundedForMs = body.groundedForMs || 0;
    }
    if (this.now >= this.freezeUntil) {
      const prev = this.phase;
      this.phase = (this.phase + this.speed * dtMs / 1000) % 1;
      if (prev < 0.5 && this.phase >= 0.5) res.crossed = true;
    }
    if (res.crossed) {
      if (this.airborne) {
        this.bottomDuringAir = true;              // cleared the rope
      } else if (this.groundedForMs >= this.t.minGroundMs && this.now >= this.invulUntil) {
        this.pending.push(this.now + this.t.bottomGraceMs);  // judge after grace window
      }
    }
    while (this.pending.length && this.pending[0] <= this.now) {
      this.pending.shift();
      if (this.airborne) continue;                 // took off within grace -> survived
      this.lives--;
      this.combo = 0;
      this.stats.trips++;
      this.invulUntil = this.now + this.t.tripInvulMs;
      this.freezeUntil = this.now + this.t.tripFreezeMs;
      this.phase = 0;                              // rope restarts from the top
      this.bottomDuringAir = false;
      this.pending = [];
      res.trip = true;
      if (this.lives <= 0) { this.over = true; res.gameOver = true; }
      break;
    }
    return res;
  }
}
