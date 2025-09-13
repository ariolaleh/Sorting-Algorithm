/* Sorting Visualizer V2
 * + Description panel (Box 1)
 * + Progress bar (Box 2)
 * + Timer (Box 3)
 * + "Bars" label + numbers inside each bar
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

// Progress "ticks"
let totalTicks = 0;
let ticksDone = 0;

// Timer state
let startTime = 0;
let elapsedMs = 0;
let timerInterval = null;

const DESCRIPTIONS = {
  merge:
    "Merge Sort splits the list into single-item pieces, then merges them back together in order. It’s consistent (O(n log n)) but uses extra memory to hold the merged halves.",
  bubble:
    "Bubble Sort repeatedly compares neighbors and swaps if they’re out of order. It’s simple, visual, but can be slow (worst O(n²)). Early exit if a pass has no swaps.",
  rng:
    "RNG (Bogo) Sort shuffles the list randomly until it happens to be sorted. It’s mostly for laughs. Progress is indeterminate because it depends on luck."
};

function updateDescription(){
  algoDescEl.textContent = DESCRIPTIONS[algoEl.value] || "";
}

function randInt(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateData(n){
  data = Array.from({length: n}, () => randInt(5, 100));
  render();
  resetProgressUI();
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

// ---------- Progress ----------
function setProgressEstimate(algorithm, n){
  if(algorithm === 'bubble'){
    // ~ number of comparisons
    totalTicks = Math.max(1, (n * (n - 1)) / 2);
  } else if(algorithm === 'merge'){
    // Roughly comparisons+writes ~ 2 * n * log2(n)
    totalTicks = Math.max(1, Math.ceil(2 * n * Math.log2(Math.max(2, n))));
  } else if(algorithm === 'rng'){
    totalTicks = 0; // indeterminate
  }
  ticksDone = 0;
  updateProgressUI();
}

function bumpTick(k = 1){
  if(totalTicks > 0){
    ticksDone += k;
    if(ticksDone > totalTicks) ticksDone = totalTicks;
    updateProgressUI();
  }
}

function updateProgressUI(){
  if(totalTicks === 0){
    // indeterminate
    progressBar.classList.add('indeterminate');
    progressFill.style.width = '30%';
    progressText.textContent = '—';
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
  updateProgressUI();
}

// ---------- Timer ----------
function resetTimer(){
  elapsedMs = 0;
  updateTimerText(0);
  clearInterval(timerInterval);
  timerInterval = null;
}

function startTimer(){
  startTime = performance.now();
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    updateTimerText(elapsedMs + (performance.now() - startTime));
  }, 31); // ~30 fps display
}

function pauseTimer(){
  if(timerInterval){
    elapsedMs += performance.now() - startTime;
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function stopTimerFinish(){
  // finalize display
  if(timerInterval){
    elapsedMs += performance.now() - startTime;
    clearInterval(timerInterval);
    timerInterval = null;
  }
  updateTimerText(elapsedMs);
}

function updateTimerText(ms){
  const total = Math.max(0, Math.floor(ms));
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const ms3 = total % 1000;
  timerText.textContent =
    String(m).padStart(2,'0') + ':' +
    String(s).padStart(2,'0') + '.' +
    String(ms3).padStart(3,'0');
}

// ---------- Events ----------
sizeEl.addEventListener('input', () => {
  sizeValEl.textContent = sizeEl.value;
  generateData(Number(sizeEl.value));
});
speedEl.addEventListener('input', () => {
  speedValEl.textContent = speedEl.value + ' ms';
});
algoEl.addEventListener('change', () => {
  updateDescription();
  resetProgressUI();
});

randomizeBtn.addEventListener('click', () => generateData(Number(sizeEl.value)));
stopBtn.addEventListener('click', () => { stopFlag = true; pauseTimer(); });

startBtn.addEventListener('click', async () => {
  if(animating) return;
  stopFlag = false;
  setUIBusy(true);
  setProgressEstimate(algoEl.value, data.length);
  resetTimer();
  startTimer();
  try {
    const algo = algoEl.value;
    if(algo === 'merge') await mergeSortVisual(data);
    else if(algo === 'bubble') await bubbleSortVisual(data);
    else if(algo === 'rng') await bogoSortVisual(data);
  } finally {
    setUIBusy(false);
    render(new Set(), new Set(Array.from(data.keys())));
    stopTimerFinish();
    // snap progress to 100% if we weren't stopped and algorithm was determinate
    if(!stopFlag && totalTicks > 0){
      ticksDone = totalTicks;
      updateProgressUI();
    }
  }
});

// ---------- Algorithms (visual) ----------
async function bubbleSortVisual(arr){
  const n = arr.length;
  for(let i = 0; i < n-1; i++){
    let swapped = false;
    for(let j = 0; j < n-i-1; j++){
      if(stopFlag) return;
      const active = new Set([j, j+1]);
      render(active);
      await sleep(currentDelay());
      // count a comparison "tick"
      bumpTick(1);

      if(arr[j] > arr[j+1]){
        [arr[j], arr[j+1]] = [arr[j+1], arr[j]];
        swapped = true;
      }
    }
    // mark last i elements as "done"
    render(new Set(), new Set(Array.from({length: n}, (_, k) => k >= n-i-1 ? k : -1).filter(k => k>=0)));
    if(!swapped) break;
  }
}

async function mergeSortVisual(arr){
  const n = arr.length;
  const aux = Array.from(arr);

  async function mergeSort(l, r){
    if(stopFlag) return;
    if(l >= r) return;
    const m = Math.floor((l + r) / 2);
    await mergeSort(l, m);
    await mergeSort(m+1, r);
    let i = l, j = m+1, k = l;
    while(i <= m && j <= r){
      if(stopFlag) return;
      render(new Set([i, j])); await sleep(currentDelay());
      bumpTick(1); // comparison
      if(arr[i] <= arr[j]) aux[k++] = arr[i++];
      else aux[k++] = arr[j++];
    }
    while(i <= m){ aux[k++] = arr[i++]; }
    while(j <= r){ aux[k++] = arr[j++]; }
    for(let t = l; t <= r; t++){
      arr[t] = aux[t];
      render(new Set([t])); await sleep(currentDelay());
      bumpTick(1); // write/placement
    }
  }
  await mergeSort(0, n-1);
}

function isSorted(a){
  for(let i=1;i<a.length;i++) if(a[i-1] > a[i]) return false;
  return true;
}

function shuffleInPlace(a){
  for(let i=a.length-1;i>0;i--){
    const j = Math.flo
