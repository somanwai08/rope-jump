// sfx.js - WebAudio synthesized sound effects (no audio files, works offline)
export class Sfx {
  constructor() { this.ctx = null; this.enabled = true; }
  _ac() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  tone(freq, dur, type, vol, slideTo) {
    const ac = this._ac();
    if (!ac) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), ac.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.2, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + dur + 0.02);
  }
  jump()   { this.tone(520, 0.12, 'triangle', 0.14, 340); }
  tick(c)  { this.tone(660 + Math.min(c, 20) * 26, 0.07, 'square', 0.10); }
  levelup(){
    this.tone(523, 0.10, 'sine', 0.16);
    setTimeout(() => this.tone(659, 0.10, 'sine', 0.16), 90);
    setTimeout(() => this.tone(784, 0.16, 'sine', 0.16), 180);
  }
  trip()   { this.tone(300, 0.40, 'sawtooth', 0.22, 90); }
  over()   { this.tone(392, 0.25, 'triangle', 0.18, 300); setTimeout(() => this.tone(262, 0.5, 'triangle', 0.18, 190), 240); }
  beep()   { this.tone(880, 0.10, 'sine', 0.18); }
  go()     { this.tone(1046, 0.25, 'sine', 0.20); }
}
