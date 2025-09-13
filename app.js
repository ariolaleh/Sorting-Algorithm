/* Sorting Visualizer
 * Algorithms: Merge Sort, Bubble Sort, RNG (Bogo)
 * Niceties: speed control, size control, randomize, stop
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

let data = [];
let animating = false;
let stopFlag = false;

function randInt(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateData(n){
  data = Array.from({length: n}, () => randInt(5, 100));
  render();
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
    barsEl.appendChild(d);
  });
}

function sleep(ms){
  return new Promise(res => setTimeout(res, ms));
}

function currentDelay(){
  return Number(speedEl.value);
}

function setUIBusy(busy){
  animating = busy;
  startBtn.disabled = busy;
  stopBtn.disabled = !busy;
  sizeEl.disabled = busy;
  algoEl.disabled = busy;
  randomizeBtn.disabled = busy;
}

sizeEl.addEventListener('input', () => {
  sizeValEl.textContent = sizeEl.value;
  generateData(Number(sizeEl.value));
});

speedEl.addEventListener('input', () => {
  speedValEl.textContent = speedEl.value + ' ms';
});

randomizeBtn.addEventListener('click', () => generateData(Number(sizeEl.value)));

stopBtn.addEventListener('click', () => { stopFlag = true; });

startBtn.addEventListener('click', async () => {
  if(animating) return;
  stopFlag = false;
  setUIBusy(true);
  try {
    const algo = algoEl.value;
    if(algo === 'merge') await mergeSortVisual(data);
    else if(algo === 'bubble') await bubbleSortVisual(data);
    else if(algo === 'rng') await bogoSortVisual(data);
  } finally {
    setUIBusy(false);
    render(new Set(), new Set(Array.from(data.keys())));
  }
});

/* --------- Algorithms (visual) ---------- */

async function bubbleSortVisual(arr){
  const n = arr.length;
  for(let i = 0; i < n-1; i++){
    let swapped = false;
    for(let j = 0; j < n-i-1; j++){
      if(stopFlag) return;
      const active = new Set([j, j+1]);
      render(active);
      await sleep(currentDelay());
      if(arr[j] > arr[j+1]){
        [arr[j], arr[j+1]] = [arr[j+1], arr[j]];
        swapped = true;
      }
    }
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
    // merge
    let i = l, j = m+1, k = l;
    while(i <= m && j <= r){
      if(stopFlag) return;
      render(new Set([i, j])); await sleep(currentDelay());
      if(arr[i] <= arr[j]) aux[k++] = arr[i++];
      else aux[k++] = arr[j++];
    }
    while(i <= m){ aux[k++] = arr[i++]; }
    while(j <= r){ aux[k++] = arr[j++]; }
    for(let t = l; t <= r; t++){
      arr[t] = aux[t];
      render(new Set([t])); await sleep(currentDelay());
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
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* RNG (Bogo) sort — with guardrails to avoid endless runs.
 * We cap attempts ~ 50 * n * ln(n) (rough heuristic); on big arrays we cut further.
 */
async function bogoSortVisual(arr){
  const n = arr.length;
  const delay = currentDelay();
  const baseCap = Math.max(200, Math.floor(50 * n * Math.log(Math.max(2,n))));
  const cap = Math.min(baseCap, 5000 + Math.max(0, 2000 - delay*5)); // soft cap
  let attempts = 0;
  while(!isSorted(arr)){
    if(stopFlag) return;
    if(attempts++ > cap){
      console.warn('Bogo stopped to protect your browser.');
      return;
    }
    shuffleInPlace(arr);
    render();
    await sleep(delay);
  }
}

/* --------- Init --------- */
(function init(){
  sizeValEl.textContent = sizeEl.value;
  speedValEl.textContent = speedEl.value + ' ms';
  generateData(Number(sizeEl.value));
})();
