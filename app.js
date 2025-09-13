/* Sorting Visualizer V2.1 — fixes:
 * - Determinate progress for Merge/Bubble, indeterminate only while RNG is running
 * - Reliable timer update (pause on Stop, finalize on completion)
 * - Always-visible, unique description per algorithm
 * - Bar value labels (high contrast)
 */

const barsEl = document.getElementById('bars');
const sizeEl = document.getElementById('size');
const sizeValEl = document.getElementById('sizeVal');
const speedEl = document.getElementById('speed');
const speedValEl = document.getElementById('speedVal');
const algoEl = document.getElementById('algo');
const randomizeBtn = document.getElementById('randomize');
const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');

const algoDescEl = document.getElementById('algoDesc');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const timerText = document.getElementById('timerText');

let data = [];
let animating = false;
let stopFlag = false;

// Progress bookkeeping
let totalTicks = 0;
let ticksDone = 0;

// Timer bookkeeping
let startTime = 0;
let elapsedMs = 0;
let timerInterval = null;

const DESCRIPTIONS = {
  merge:
    "Merge Sort splits the list into single items, then merges the pieces back in order. Consistent O(n log n) time, but uses extra memory when merging.",
  bubble:
    "Bubble Sort compares neighbors and swaps if they’re out of order. Super simple and visual, but worst-case O(n²). Early exit if a pass makes no swaps.",
  rng:
    "RNG (Bogo) Sort shuffles randomly until sorted. It’s purely for fun—finish time is luck-based, so progress is shown as ‘indeterminate’ while it runs."
};

function updateDescription(){
  algoDescEl.textContent = DESCRIPTIONS[algoEl.value] || "";
}

function randInt(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateData(n){
  data = Array.from({length: n}, () => randInt(5, 100));
  render();
  resetProgressUI();   // back to 0% / idle
  resetTimer();
}

function render(activeIdxs = new Set(), doneIdxs = new Set()){
  barsEl.innerHTML = '';
  const max = Math.max(...data, 100);
  data.forEach((v, i) => {
    const d = document.createElement('div');
    d.className = 'bar';
    if(activeIdxs.has(i)) d.classList.add('active');
    if(doneIdxs.has(i)) d.classList.add('done');
    const h = Math.max(2, Math.round((v / max) * 100));
    d.style.height = h + '%';
    d.title = String(v);

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = String(v);
    d.appendChild(label);

    barsEl.appendChild(d);
  });
}

function sleep(ms){ return new Promise(res => setTimeout(res, ms)); }
function currentDelay(){ return Number(speedEl.value); }

function setUIBusy(busy){
  animating = busy;
  startBtn.disabled = busy;
  stopBtn.disabled = !busy;
  sizeEl.disabled = busy;
  algoEl.disabled = busy;
  randomizeBtn.disabled = busy;
}

/* ---------------- Progress ---------------- */
function setProgressEstimate(algorithm, n){
  if(algorithm === 'bubble'){
    totalTicks = Math.max(1, (n * (n - 1)) / 2);                // ~comparisons
  } else if(algorithm === 'merge'){
    const log2n = Math.log(Math.max(2, n)) / Math.LN2;           // robust log2
    totalTicks = Math.max(1, Math.ceil(2 * n * log2n));          // rough comps+writes
  } else if(algorithm === 'rng'){
    totalTicks = 0;                                              // indeterminate
  }
  ticksDone = 0;
  updateProgressUI(false); // not animating yet
}

function bumpTick(k = 1){
  if(totalTicks > 0){
    ticksDone += k;
    if(ticksDone > totalTicks) ticksDone = totalTicks;
    updateProgressUI(true);
  }
}

function updateProgressUI(isRunning){
  if(totalTicks === 0){
    // RNG only shows indeterminate WHILE running
    if(isRunning){
      progressBar.classList.add('indeterminate');
    } else {
      progressBar.classList.remove('indeterminate');
    }
    progressFill.style.width = isRunning ? '30%' : '0%';
    progressText.textContent = isRunning ? '—' : '0%';
  } else {
    progressBar.classList.remove('indeterminate');
    const pct = Math.floor((ticksDone / totalTicks) * 100);
    progressFill.style.width = pct + '%';
    progressText.textContent = pct + '%';
  }
}

function resetProgressUI(){
  totalTicks = 0;
  ticksDone = 0;
  progressBar.classList.remove('indeterminate');
  progressFill.style.width = '0%';
  progressText.textContent = '0%';
}

/* ---------------- Timer ---------------- */
function resetTimer(){
  elapsedMs = 0;
  updateTimerText(0);
  if(timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function startTimer(){
  startTime = performance.now();
  if(timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    updateTimerText(elapsedMs + (performance.now() - startTime));
  }, 33); // ~30fps display
}

function pauseTimer(){
  if(timerInterval){
    elapsedMs += performance.now() - startTime;
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function stopTimerFinish(){
  if(timerInterval){
    elapsedMs += performance.now() - startTime;
    clearInterval(timerInterval);
    timerInterval = null;
  }
  updateTimerText(elapsedMs);
}

function updateTimerText(ms){
  const t = Math.max(0, Math.floor(ms));
  const m = Math.floor(t / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const ms3 = t % 1000;
  timerText.textContent =
