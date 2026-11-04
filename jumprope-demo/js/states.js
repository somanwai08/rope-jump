// states.js - game flow: calibration, countdown, play, result, leaderboard save
import { TUNING } from './tuning.js';
import { $, showMsg, setScreen } from './ui.js';

export function beginRound(A, label) {
  A.currentLabel = label;
  A.det.reset();
  A.game.reset();
  A.game.t.ropeSpeedMax = A.isSim() ? TUNING.ropeStartSpeed : TUNING.ropeSpeedMax;
  if (A.isSim()) A.source.start(performance.now());
  A.playMs = 0;
  A.lostAt = 0;
  A.flashT = 0;
  A.renderer.plist = [];
  $('mode-label').textContent = label;
  $('score').textContent = '0';
  $('combo').textContent = 'x0';
  $('lives').textContent = A.game.lives;
  $('timer').textContent = Math.ceil(TUNING.roundMs / 1000);
  $('speedv').textContent = A.game.speed.toFixed(1);
  setScreen('hud');
  A.state = 'calib';
  A.calibEnd = performance.now() + 2600;
  A.calibTrack = 0;
  A.calibFrames = 0;
  A.calibBright = 0;
  A.sfx._ac();
}

export function handleLanding(A, ev) {
  const f = A.game.feed(ev);
  if (!f) return;
  if (f.type === 'score') {
    A.sfx.tick(f.combo);
    A.renderer.burst('#7ef9ff', 18);
    if (f.speedUp) {
      A.sfx.levelup();
      showMsg('繩子加速！' + A.game.speed.toFixed(1) + ' 圈/秒', 1200);
    }
  } else if (f.type === 'wasted' && f.hint) {
    showMsg('揮空！要跟繩子同一拍', 1100);
  }
}

export function calibStep(A, now, dt, d, fr) {
  if (fr && fr.video && fr.video.videoWidth) A.calibBright += A.brightness(fr.video);
  A.calibFrames++;
  if (d.tracking) A.calibTrack += dt;
  if (now >= A.calibEnd) {
    const brightOk = A.isSim() || (A.calibBright / Math.max(1, A.calibFrames)) >= 45;
    if (A.calibTrack >= 1800 && brightOk) {
      A.state = 'countdown';
      A.countStart = now;
      A.lastCount = -1;
    } else {
      A.calibEnd = now + 2600;
      A.calibTrack = 0;
      A.calibFrames = 0;
      A.calibBright = 0;
      showMsg(A.calibTrack < 1800
        ? '偵測不到完整人體：請後退，讓全身（含腳）入鏡'
        : '畫面太暗：請增加光線、避免背光', 2500);
    }
  }
}

export function countStep(A, now) {
  const left = Math.ceil((A.countStart + 3000 - now) / 1000);
  if (left !== A.lastCount && left > 0) {
    A.lastCount = left;
    showMsg(String(left), 800);
    A.sfx.beep();
  }
  if (now >= A.countStart + 3000) {
    A.state = 'play';
    A.playMs = 0;
    showMsg('開始跳！', 700);
    A.sfx.go();
  }
}

export function playStep(A, now, dt, d) {
  if (d.tracking) {
    A.playMs += dt;
    A.lostAt = 0;
  } else {
    if (!A.lostAt) A.lostAt = now;
    if (now - A.lostAt > 700) showMsg('請回到畫面中央！', 300);
  }
  const r = A.game.update(dt, d.tracking, now, {
    airborne: d.airborne,
    groundedForMs: d.groundedForMs
  });
  if (r.trip) {
    A.sfx.trip();
    A.flashT = now;
    A.renderer.burst('#ff5a5a', 30);
    showMsg('絆腳了！', 900);
  }
  if (r.gameOver) { endRound(A, false); return; }
  if (A.playMs >= TUNING.roundMs) { endRound(A, true); return; }
  $('score').textContent = A.game.score;
  $('combo').textContent = 'x' + A.game.combo;
  $('lives').textContent = A.game.lives;
  $('timer').textContent = Math.max(0, Math.ceil((TUNING.roundMs - A.playMs) / 1000));
  $('speedv').textContent = A.game.speed.toFixed(1);
}

export function endRound(A, success) {
  A.state = 'result';
  if (success) A.sfx.go(); else A.sfx.over();
  $('r-score').textContent = A.game.score;
  $('r-jumps').textContent = A.game.jumps;
  $('r-combo').textContent = 'x' + A.game.maxCombo;
  if (A.game.score > A.getBest()) {
    localStorage.setItem('jr_best_v1', String(A.game.score));
    $('newbest').classList.remove('hidden');
  } else {
    $('newbest').classList.add('hidden');
  }
  $('r-best').textContent = A.getBest();
  $('name').value = localStorage.getItem('jr_name_v1') || '';
  setScreen('result');
}

export function saveScore(A) {
  const name = ($('name').value || '無名').slice(0, 12);
  localStorage.setItem('jr_name_v1', name);
  let lb = [];
  try { lb = JSON.parse(localStorage.getItem('jr_lb_v1') || '[]'); } catch (e) {}
  lb.push({ name, score: A.game.score, d: Date.now() });
  lb.sort((a, b) => b.score - a.score);
  localStorage.setItem('jr_lb_v1', JSON.stringify(lb.slice(0, 10)));
  backToMenu(A);
}

export function backToMenu(A) {
  A.state = 'menu';
  setScreen('menu');
  A.renderLb();
  A.setStatus('就緒。');
}
