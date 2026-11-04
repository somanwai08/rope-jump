// camera_source.js - MediaPipe Pose Landmarker wrapper (local vendor first, CDN fallback)
const LOCAL_PKG = '../vendor/tasks-vision/vision_bundle.mjs';
const LOCAL_WASM = '../vendor/tasks-vision/wasm';
const CDN_PKG = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
const CDN_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const LOCAL_MODEL = 'assets/models/pose_landmarker_lite.task';
const CDN_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export class CameraPoseSource {
  constructor() {
    this.video = document.createElement('video');
    this.video.playsInline = true;
    this.video.muted = true;
    this.video.setAttribute('playsinline', '');
    this.video.style.cssText = 'position:absolute;left:-9999px;width:8px;height:8px;opacity:0.01;';
    document.body.appendChild(this.video);
    this.lastVT = -1;
    this.lastTs = 0;
    this.landmarker = null;
  }
  async init(status) {
    const say = (s) => { if (status) status(s); };
    say('載入 AI 模型...');
    let mod, wasmBase, offline = true;
    try {
      mod = await import(LOCAL_PKG);
      wasmBase = LOCAL_WASM;
    } catch (e) {
      offline = false;
      say('本地模型檔缺失，改用線上 CDN（需網路）...');
      mod = await import(CDN_PKG);
      wasmBase = CDN_WASM;
    }
    let fileset;
    try {
      fileset = await mod.FilesetResolver.forVisionTasks(wasmBase);
    } catch (e) {
      if (!offline) throw e;
      say('本地 WASM 載入失敗，改用線上 CDN...');
      mod = await import(CDN_PKG);
      fileset = await mod.FilesetResolver.forVisionTasks(CDN_WASM);
      offline = false;
    }
    const attempts = [
      [LOCAL_MODEL, 'GPU'], [LOCAL_MODEL, 'CPU'],
      [CDN_MODEL, 'GPU'], [CDN_MODEL, 'CPU']
    ];
    let lastErr = null;
    for (const pair of attempts) {
      try {
        this.landmarker = await mod.PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: pair[0], delegate: pair[1] },
          runningMode: 'VIDEO',
          numPoses: 1
        });
        say('AI 模型就緒（' + (offline ? '離線檔' : 'CDN') + ' / ' + pair[1] + '）');
        break;
      } catch (e) { lastErr = e; }
    }
    if (!this.landmarker) throw new Error('AI 模型載入失敗：' + (lastErr && lastErr.message));
    say('開啟攝影機（請在瀏覽器允許權限）...');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
    } catch (e) {
      const map = {
        NotAllowedError: '攝影機權限被拒絕（請在網址列允許攝影機後重試）',
        NotFoundError: '找不到攝影機裝置',
        NotReadableError: '攝影機被其他程式占用中'
      };
      throw new Error(map[e.name] || ('攝影機錯誤：' + e.name));
    }
    this.video.srcObject = stream;
    await this.video.play();
    if (this.video.readyState < 2) {
      await new Promise(res => { this.video.onloadeddata = res; setTimeout(res, 1500); });
    }
    say('攝影機就緒');
  }
  next(nowMs) {
    if (!this.landmarker || this.video.readyState < 2) {
      return { landmarks: null, ts: this.lastTs };
    }
    if (this.video.currentTime === this.lastVT) {
      return { landmarks: null, ts: this.lastTs, stale: true };
    }
    this.lastVT = this.video.currentTime;
    const ts = Math.max(nowMs, this.lastTs + 1);
    this.lastTs = ts;
    let lm = null;
    try {
      const res = this.landmarker.detectForVideo(this.video, ts);
      if (res && res.landmarks && res.landmarks.length) lm = res.landmarks[0];
    } catch (e) { /* transient frame error - skip */ }
    return { landmarks: lm, ts };
  }
}
