// render.js - canvas renderer: mirrored video, neon skeleton, particles, trip flash
import { drawRope } from './rope.js';

const BONES = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [27, 29], [29, 31], [27, 31], [28, 30], [30, 32], [28, 32],
  [0, 11], [0, 12]
];

export class Renderer {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.mirror = false;
    this.feet = { x: 0.5, y: 0.9 };
    this.plist = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    const r = this.cv.parentElement.getBoundingClientRect();
    this.W = Math.max(320, Math.round(r.width));
    this.H = Math.max(240, Math.round(r.height));
    this.cv.width = Math.round(this.W * this.dpr);
    this.cv.height = Math.round(this.H * this.dpr);
    this.cv.style.width = this.W + 'px';
    this.cv.style.height = this.H + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
  burst(color, n) {
    n = n || 22;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.5 + Math.random() * 4.5;
      this.plist.push({
        x: this.feet.x * this.W, y: this.feet.y * this.H,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3.5,
        life: 1, color: color || '#7ef9ff'
      });
    }
  }
  _sx(x) { return (this.mirror ? 1 - x : x) * this.W; }
  _sy(y) { return y * this.H; }
  _drawVideo(video) {
    const c = this.ctx, W = this.W, H = this.H;
    const va = video.videoWidth / video.videoHeight, ca = W / H;
    let dw, dh;
    if (va > ca) { dh = H; dw = H * va; } else { dw = W; dh = W / va; }
    const dx = (W - dw) / 2, dy = (H - dh) / 2;
    c.save();
    if (this.mirror) {
      c.translate(W, 0); c.scale(-1, 1);
      c.drawImage(video, W - dx - dw, dy, dw, dh);
    } else {
      c.drawImage(video, dx, dy, dw, dh);
    }
    c.restore();
  }
  _skeleton(lm) {
    const c = this.ctx;
    c.save();
    c.lineWidth = 3;
    c.strokeStyle = '#7ef9ff';
    c.shadowColor = '#7ef9ff';
    c.shadowBlur = 10;
    c.beginPath();
    for (const b of BONES) {
      const p = lm[b[0]], q = lm[b[1]];
      if (!p || !q) continue;
      if ((p.visibility ?? 1) < 0.4 || (q.visibility ?? 1) < 0.4) continue;
      c.moveTo(this._sx(p.x), this._sy(p.y));
      c.lineTo(this._sx(q.x), this._sy(q.y));
    }
    c.stroke();
    c.fillStyle = '#eaffff';
    c.shadowBlur = 8;
    for (let i = 0; i < lm.length; i++) {
      if (i >= 17 && i <= 22) continue;
      const p = lm[i];
      if (!p || (p.visibility ?? 1) < 0.5) continue;
      c.beginPath();
      c.arc(this._sx(p.x), this._sy(p.y), 3.2, 0, 7);
      c.fill();
    }
    c.restore();
  }
  frame(o) {
    const c = this.ctx, W = this.W, H = this.H;
    this.mirror = !!o.mirror;
    c.clearRect(0, 0, W, H);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b1020');
    g.addColorStop(1, '#141c33');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    if (o.video && o.video.videoWidth) this._drawVideo(o.video);
    const lm = o.lm;
    if (lm && lm[27] && (lm[27].visibility ?? 1) > 0.5) {
      const ax = (lm[27].x + lm[28].x) / 2, ay = (lm[27].y + lm[28].y) / 2;
      this.feet = { x: this.mirror ? 1 - ax : ax, y: ay };
    }
    if (o.show) {
      if (lm) {
        drawRope(c, W, H, this.mirror, lm, o.phase, false);
        this._skeleton(lm);
        drawRope(c, W, H, this.mirror, lm, o.phase, true);
      } else {
        c.fillStyle = 'rgba(255,255,255,0.75)';
        c.font = '20px "Microsoft JhengHei", sans-serif';
        c.textAlign = 'center';
        c.fillText('等待人體入鏡...', W / 2, H / 2);
      }
    }
    for (const p of this.plist) { p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.life -= 0.03; }
    this.plist = this.plist.filter(p => p.life > 0);
    for (const p of this.plist) {
      c.globalAlpha = Math.max(0, p.life);
      c.fillStyle = p.color;
      c.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    c.globalAlpha = 1;
    if (o.flashT && performance.now() - o.flashT < 450) {
      const a = 0.5 * (1 - (performance.now() - o.flashT) / 450);
      c.fillStyle = 'rgba(255,40,40,' + a.toFixed(3) + ')';
      c.fillRect(0, 0, W, H);
    }
  }
}
