// tuning.js - single source of truth for game parameters (matches proposal Appendix A)
export const TUNING = {
  groundEps: 0.012,       // tolerance to consider "on ground" (normalized coords)
  jumpAmp: 0.045,         // min valid jump amplitude (fraction of frame height)
  jumpMaxMs: 750,         // max duration of one jump
  minGroundMs: 120,       // min grounded time before a crossing can trip
  bottomGraceMs: 90,      // grace window for rope-bottom crossing (detection latency)
  ropeStartSpeed: 0.8,    // revolutions per second
  ropeSpeedStep: 0.1,     // speed increment
  ropeSpeedMax: 2.0,      // speed cap
  speedUpEvery: 10,       // speed up every N scored jumps
  lives: 3,
  roundMs: 60000,         // one round = 60s
  tripFreezeMs: 800,      // rope freeze after a trip
  tripInvulMs: 1500,      // invulnerable window after a trip
  visGate: 0.5,           // min ankle visibility to count as tracking
  gapToleranceMs: 300,    // tolerate short landmark gaps (stale video frames)
  baselineWindowMs: 2000, // dynamic ground baseline window
  wastedCooldownMs: 1200, // "too early/late" hint cooldown
  torsoRatio: 0.6         // shoulder-hip vertical distance vs shoulder width
};
