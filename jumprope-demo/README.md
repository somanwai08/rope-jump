# 空氣跳繩大作戰 — Web AI Booth Demo（PyCon 2026 GDG）

純前端體感跳繩遊戲：MediaPipe Pose（WASM + GPU delegate）在瀏覽器內即時追蹤
33 個人體關鍵點，配合「虛擬繩相位模型」實現跳躍計分與絆腳判定。
**攝影機影像不上傳、無伺服器、可 100% 離線運行。**（Windows / macOS / Linux）

## 快速開始

**第 0 步（首次）— 下載 AI 資源**（模型 5.8MB + 推論引擎 19MB，不進 git）：

| 平台 | 指令 |
|---|---|
| Windows | `powershell -ExecutionPolicy Bypass -File vendor_download.ps1` |
| macOS / Linux | `bash vendor_download.sh` |

（有網路時即使缺這些檔案，頁面也會自動退回 CDN 載入）

**第 1 步 — 啟動**：

| 平台 | 方式 |
|---|---|
| **Windows** | 雙擊 `run.bat`（自動偵測 Python；沒有則退內建 `serve.ps1`） |
| **macOS / Linux** | 終端機執行 `bash run.sh`（需要 `python3` 或 `node`） |

啟動後瀏覽器自動開 `http://localhost:8000/`。**建議使用 Chrome**（Safari 對
WebGL/WASM 的支援較不一致）。

> macOS 小提醒：第一次執行 `python3` 若彈出「安裝命令列開發者工具」視窗，
> 點安裝、完成後重跑 `bash run.sh` 即可。

## 三種模式

| 模式 | 用途 | 需要什麼 |
|---|---|---|
| 執行自動測試 | 無頭模擬 60 秒對局，驗證計分/絆腳/揮空/暫停邏輯 | 什麼都不用（離線） |
| 無攝影機測試模式 | 合成玩家照劇本跳繩（含絆腳與離開畫面），驗證畫面/音效/流程 | 什麼都不用（離線） |
| 攝影機開始 | 正式玩法 | webcam + `vendor/` 模型檔（缺失時自動退 CDN，需網路） |

命令列跑自動測試（Node 18+）：`node js/qa.mjs`（全部通過會印 `ALL TESTS PASSED`）

## 給幫忙測試的人：檢查清單

1. **自動測試**：按鈕按下後所有項目應為 `[PASS]`
2. **模擬模式**：看得到發光繩子繞著假人轉、分數會增加、每 10 幾秒出現一次「絆腳了！」、
   20~22.5 秒時「玩家離開畫面」且遊戲暫停不誤判
3. **攝影機模式**：
   - 對位階段：站遠一點讓**全身含腳**入鏡，骨架變穩定後會自動倒數
   - 跟著繩子跳 → 分數/連擊增加；故意不跳 → 絆腳（3 次結束）
   - 走出畫面 → 遊戲暫停（不會誤判絆腳），回來後繩子重新從頭轉
   - 背光/太暗 → 對位階段會提示「畫面太暗」
4. **效能**：一般筆電（近 5 年 i5 / Apple M 系列）應有 25~30fps；卡頓時 F12 主控台看報錯

## 常見問題

- **Port 8000 被占用**：`python3 server.py 8080` 或 `node server.cjs 8080`（手動開 `http://localhost:8080/`）
- **攝影機權限被拒**：點網址列的鎖頭 → 攝影機 → 允許 → 重新整理
- **找不到模型**：重跑 `vendor_download.ps1`／`vendor_download.sh`（需網路）
- **畫面太暗**：加燈、避免背窗；程式會在對位階段提示
- **Windows 的 python 開了 Microsoft Store**：那是 Store 佔位程式；`run.bat` 已自動跳過它，
  或到 python.org 安裝真正的 Python 3

## 參數調整

所有判定參數集中在 `js/tuning.js`（跳躍幅度門檻、容錯窗、繩速、命數、回合長度…），
改完重新整理頁面即生效；改邏輯後記得重跑 `node js/qa.mjs` 確認全綠。

## 檔案結構

```
index.html / css/             頁面與樣式
js/tuning.js                  所有可調參數（單一來源）
js/detector.js                跳躍偵測（純邏輯，可 Node 測試）
js/game_core.js               繩相位 + 絆腳判定 + 計分（純邏輯）
js/sim_source.js              無攝影機的合成玩家（8跳+1揮空+1絆腳循環）
js/camera_source.js           MediaPipe 封裝（本地優先→CDN 退路；GPU→CPU 退路）
js/render.js / rope.js        渲染（鏡像視訊、霓虹骨架、發光繩、粒子）
js/sfx.js                     WebAudio 合成音效（無音檔）
js/app.js / states.js / ui.js 狀態機與 UI
js/qa_core.js / qa.mjs        自動測試（瀏覽器按鈕與 Node 共用）
server.py / server.cjs        Python / Node 零相依伺服器（MIME 修正版）
serve.ps1 / run.bat           Windows 伺服器與啟動器
run.sh / vendor_download.sh   macOS/Linux 啟動器與模型下載
vendor/ + assets/models/      MediaPipe WASM 與模型（離線用，不進 git）
```
