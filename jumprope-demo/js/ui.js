// ui.js - DOM helpers, screens, leaderboard, brightness probe, QA panel, event wiring
export const $ = (id) => document.getElementById(id);

export function setStatus(s) { $('statusline').textContent = s; }

export function setScreen(name) {
  for (const id of ['menu', 'hud', 'result', 'qaout']) {
    $(id).classList.toggle('hidden', id !== name);
  }
}

export function showMsg(text, ms) {
  const el = $('msg');
  if (!text) { el.classList.add('hidden'); return; }
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(showMsg._t);
  showMsg._t = setTimeout(() => el.classList.add('hidden'), ms || 1000);
}

export function getBest() { return parseInt(localStorage.getItem('jr_best_v1') || '0', 10) || 0; }

export function renderLb() {
  let lb = [];
  try { lb = JSON.parse(localStorage.getItem('jr_lb_v1') || '[]'); } catch (e) {}
  const ol = $('lb-list');
  ol.textContent = '';
  const top = lb.slice(0, 10);
  if (!top.length) {
    const li0 = document.createElement('li');
    li0.textContent = '（尚無紀錄——來當第一個！）';
    ol.appendChild(li0);
    return;
  }
  for (const e of top) {
    const li = document.createElement('li');
    const nm = document.createElement('span');
    nm.textContent = e.name;
    const sc = document.createElement('b');
    sc.textContent = ' ' + e.score;
    li.appendChild(nm);
    li.appendChild(sc);
    ol.appendChild(li);
  }
}

const bc = document.createElement('canvas');
bc.width = 64;
bc.height = 48;
const bctx = bc.getContext('2d', { willReadFrequently: true });
export function brightness(video) {
  try {
    bctx.drawImage(video, 0, 0, 64, 48);
    const d = bctx.getImageData(0, 0, 64, 48).data;
    let s = 0, n = 0;
    for (let i = 0; i < d.length; i += 16) {
      s += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      n++;
    }
    return s / n;
  } catch (e) { return 255; }
}

export function runQAPanel(runQAFn) {
  setScreen('qaout');
  $('qaout-body').textContent = '執行中...（模擬 60 秒對局，約一秒）';
  setTimeout(() => {
    const rs = runQAFn();
    let fail = 0;
    const lines = rs.map(r => {
      if (!r.pass) fail++;
      return (r.pass ? '[PASS] ' : '[FAIL] ') + r.name + (r.detail ? '  [' + r.detail + ']' : '');
    });
    lines.push('');
    lines.push(fail === 0 ? ('全部通過（' + rs.length + ' 項）') : (fail + ' 項失敗 / ' + rs.length));
    $('qaout-body').textContent = lines.join('\n');
  }, 30);
}

export function wireUI(h) {
  $('btn-cam').addEventListener('click', h.cam);
  $('btn-sim').addEventListener('click', h.sim);
  $('btn-qa').addEventListener('click', h.qa);
  $('btn-qa-close').addEventListener('click', h.menu);
  $('btn-save').addEventListener('click', h.save);
  $('btn-retry').addEventListener('click', h.retry);
  $('btn-menu2').addEventListener('click', h.menu);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); h.space(); }
    else if (e.code === 'KeyR') h.r();
  });
}
