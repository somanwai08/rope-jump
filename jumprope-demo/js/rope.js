// rope.js - virtual rope drawing: track ellipse + glowing head, front/back passes for 3D feel
export function drawRope(ctx, W, H, mirror, lm, phase, frontPass) {
  let hx = 0.5, hy = 0.62, shY = 0.43, ankY = 0.88;
  if (lm && lm[23] && lm[24] && (lm[23].visibility ?? 1) > 0.5) {
    hx = (lm[23].x + lm[24].x) / 2;
    hy = (lm[23].y + lm[24].y) / 2;
    if (lm[11] && lm[12]) shY = (lm[11].y + lm[12].y) / 2;
    if (lm[27] && lm[28] && (lm[27].visibility ?? 1) > 0.5) ankY = (lm[27].y + lm[28].y) / 2;
  }
  const sx = (x) => (mirror ? 1 - x : x) * W;
  const cx = sx(hx), cy = hy * H;
  const R = Math.max(H * 0.16, Math.abs(ankY - shY) * H * 0.55);
  const rx = Math.max(30, R * 0.32);
  const ang = phase * Math.PI * 2;
  const front = Math.sin(ang) > 0;
  if (front !== frontPass) return;
  ctx.save();
  ctx.setLineDash([6, 10]);
  ctx.strokeStyle = 'rgba(126,249,255,0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, R, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineCap = 'round';
  const N = 10;
  for (let k = N; k >= 1; k--) {
    const a = ang - k * 0.09;
    const x = cx + Math.sin(a) * rx, y = cy - Math.cos(a) * R;
    const px = cx + Math.sin(a - 0.09) * rx, py = cy - Math.cos(a - 0.09) * R;
    ctx.globalAlpha = (1 - k / (N + 1)) * (front ? 0.9 : 0.3);
    ctx.strokeStyle = front ? '#7ef9ff' : '#39798c';
    ctx.lineWidth = front ? 5 : 3;
    ctx.shadowColor = front ? '#7ef9ff' : 'transparent';
    ctx.shadowBlur = front ? 16 : 0;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#7ef9ff';
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(cx + Math.sin(ang) * rx, cy - Math.cos(ang) * R, front ? 7 : 4.5, 0, 7);
  ctx.fill();
  ctx.restore();
}
