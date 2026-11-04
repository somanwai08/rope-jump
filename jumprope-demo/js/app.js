// app.js - bootstrap: app context, main loop, camera/sim startup, event wiring
import { TUNING } from './tuning.js';
import { JumpDetector } from './detector.js';
import { RopeGame } from './game_core.js';
import { SimPoseSource } from './sim_source.js';
import { CameraPoseSource } from './camera_source.js';
import { Renderer } from './render.js';
import { Sfx } from './sfx.js';
import { runQA } from './qa_core.js';
import { $, setScreen, showMsg, renderLb, getBest, brightness, setStatus, wireUI, runQAPanel } from './ui.js';
import { beginRound, handleLanding, calibStep, countStep, playStep, saveScore, backToMenu } from './states.js';

const renderer = new Renderer($('view'));
const sfx = new Sfx();

const A = {
  det: new JumpDetector(),
  game: new RopeGame(),
  renderer,
  sfx,
  source: null,
  camSource: null,
  simSource: null,
  state: 'menu',
  lastT: 0,
  playMs: 0,
  lostAt: 0,
  flashT: 0,
  calibEnd: 0,
  calibTrack: 0,
  calibFrames: 0,
  calibBright: 0,
  countStart: 0,
  lastCount: -1,
  currentLabel: '',
  isSim: () => A.source instanceof SimPoseSource,
  getBest,
  renderLb,
  setStatus,
  brightness
};

async function startCamera() {
  try {
    setScreen(null);
    if (!A.camSource) {
      setStatus('初始化 AI 模型與攝影機（首次約需數秒）...');
      A.camSource = new CameraPoseSource();
      await A.camSource.init(setStatus);
    }
    A.source = A.camSource;
    beginRound(A, '攝影機模式');
  } catch (e) {
    A.source = null;
    setStatus('攝影機模式啟動失敗：' + e.message);
    setScreen('menu');
    showMsg('攝影機無法啟動，可改用「無攝影機測試模式」', 3000);
  }
}

function startSim() {
  if (!A.simSource) A.simSource = new SimPoseSource();
  A.source = A.simSource;
  beginRound(A, '模擬模式（固定繩速 0.8 圈/秒）');
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(100, now - (A.lastT || now));
  A.lastT = now;
  let d = { tracking: false, airborne: false, groundedForMs: 0, events: [] };
  let fr = { landmarks: null, ts: now, video: null };
  if (A.source && (A.state === 'calib' || A.state === 'countdown' || A.state === 'play')) {
    fr = A.isSim()
      ? A.source.next(now, A.game.phase, A.game.speed)
      : A.source.next(now);
    if (!A.isSim() && A.source.video) fr.video = A.source.video;
    d = A.det.update(fr.landmarks, fr.ts || now);
    for (const ev of d.events) {
      if (ev.type === 'landing' && A.state === 'play') handleLanding(A, ev);
    }
  }
  if (A.state === 'calib') calibStep(A, now, dt, d, fr);
  else if (A.state === 'countdown') countStep(A, now);
  else if (A.state === 'play') playStep(A, now, dt, d);
  renderer.frame({
    video: fr.video || null,
    lm: fr.landmarks,
    mirror: !A.isSim(),
    phase: A.game.phase,
    show: (A.state === 'calib' || A.state === 'countdown' || A.state === 'play'),
    flashT: A.flashT
  });
}

wireUI({
  cam: startCamera,
  sim: startSim,
  qa: () => runQAPanel(runQA),
  menu: () => backToMenu(A),
  save: () => saveScore(A),
  retry: () => beginRound(A, A.currentLabel),
  space: () => {
    if (A.state === 'menu') startSim();
    else if (A.state === 'result') beginRound(A, A.currentLabel);
  },
  r: () => { if (A.state === 'result') beginRound(A, A.currentLabel); }
});
renderLb();
setStatus('就緒：攝影機模式需 vendor/ 模型檔；測試模式與自動測試完全離線可用。');
requestAnimationFrame(loop);
