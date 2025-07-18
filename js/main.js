 import Chart from "https://cdn.jsdelivr.net/npm/chart.js/+esm";   // <script type="module">

/* PortaFolio Pro – lógica mínima (v0.2) */
document.addEventListener('DOMContentLoaded', async () => {

 /* ---------- A. Pyodide ---------- */
const pyodideReady = loadPyodide({
  indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.0/full/"
}).then(async (py) => {
  await py.loadPackage([
    'numpy', 'pandas',
    'requests', 'pyodide-http'   //  ← ya los habías añadido
  ]);
  await py.loadPackage('micropip');
  console.log('✅ Pyodide listo');
  return py;
});

window.pyodideReady = pyodideReady;   // <<–– ¡ESTA LÍNEA!
 
let pricesChart;                       // gráfico global (una sola instancia)

function destroyChart(){
  if (pricesChart) { pricesChart.destroy(); pricesChart = null; }
}


  /* ---------- B. DOM refs ---------- */
  const advancedToggle = document.getElementById('advanced-toggle');
  const advancedPanel  = document.getElementById('advanced-panel');
  const lookbackSelect = document.getElementById('lookback-select');
  const customDates    = document.getElementById('custom-dates');
  const dateStartInput = document.getElementById('date-start');
  const dateEndInput   = document.getElementById('date-end');
  const optimizeBtn    = document.getElementById('optimize-btn');
  const dashboard      = document.getElementById('dashboard');

  /* ---------- C. UI behaviours ---------- */
  advancedToggle.addEventListener('change', () =>
    advancedPanel.classList.toggle('hidden', !advancedToggle.checked)
  );

  lookbackSelect.addEventListener('change', e =>
    customDates.classList.toggle('hidden', e.target.value !== 'custom')
  );

  function buildPythonInput(){
    const tickers = document.getElementById('tickers-input').value
      .split(',')
      .map(t => t.trim().toUpperCase())
      .filter(Boolean);

    const freq = document.getElementById('freq-select').value;
    const rf   = parseFloat(document.getElementById('rf-input').value) || 0;

    const lookback = lookbackSelect.value;
    if(lookback !== 'custom'){
      return {tickers, freq, rf, mode:'preset', lookback};
    }
    return {
      tickers, freq, rf, mode:'custom',
      start: dateStartInput.value, end: dateEndInput.value
    };
  }

  /* ---------- D. Optimize (placeholder) ---------- */
  optimizeBtn.addEventListener('click', async () => {
    // 1) Validaciones rápidas
    const tickers = document.getElementById('tickers-input').value
      .split(',')
      .map(t => t.trim().toUpperCase())
      .filter(Boolean);
    if (tickers.length === 0) { alert('Ingresa al menos un ticker'); return; }
    if (tickers.length > 20)  { alert('Máximo 20 activos'); return; }

    // 2) Mostrar dashboard
    dashboard.classList.remove('hidden');

// 3) Ejecutar Python
try {
  const py = await pyodideReady;

  // 3-a) Preparo parámetros y los paso a Python
  const params = buildPythonInput();
  py.globals.set('params', params);

  // 3-b) Traigo el código de Python desde GitHub Pages
  const response = await fetch("python/fetch_prices.py");
  const code     = await response.text();

  // 3-c) Lo ejecuto en Pyodide y, si crashea, muestro el traceback
  try {
    await py.runPythonAsync(code);          // ← aquí corre fetch_prices.py
  } catch (err) {
    console.error(err);                                 // muestra el stack JS+Py
    alert('Uy, Python explotó: ' + err);    // aviso amigable por si acaso
    throw err;                              // re-lanzamos para que JS se entere
  }

// 3-d) Leer resultados y actualizar la UI -------------------------
const statsProxy   = py.globals.get('stats');          // PyProxy
const pricesJSON   = py.globals.get('py_prices_json'); // << string JSON
const stats        = statsProxy.toJs();                // objeto JS normal
updateMetricCards(stats);                              // métricas

// ---------- Gráfico de precios ----------------------------------
destroyChart();                                        // si existía uno

const dataJS  = JSON.parse(pricesJSON);                // array de objetos
const labels  = dataJS.map(r => r.Date);
const datasets = params.tickers.map(t => ({
  label : t,
  data  : dataJS.map(r => r[t]),
  fill  : false
}));

pricesChart = new Chart(
  document.getElementById('pricesChart'),
  {
    type   : "line",
    data   : { labels, datasets },
    options: {
      responsive: true,
      scales: {
        x: { ticks: { maxTicksLimit: 10 } },
        y: { title: { display: true, text: "Precio ajustado" } }
      }
    }
  }
);


// 3) ¡importante! liberar proxies
statsProxy.destroy();
returnsProxy.destroy();
pricesProxy.destroy();


} catch (err) {
  // Falla la red o la carga del .py ⇒ caemos aquí
  console.error(err);
  alert('Error al obtener o ejecutar fetch_prices.py');
}

    // 4) Dibujar gráficos placeholder
    drawPlaceholders();
    if (window.innerWidth < 1200) dashboard.scrollIntoView({behavior:'smooth'});
  });

  /* ---------- API KEY helper ---------- */
window.guardarKey = function guardarKey() {
  const key = document.getElementById("apiKeyInput").value.trim();
  if (!key) { alert("⚠️  Escribe tu clave primero"); return; }

  localStorage.setItem("av_key", key);
  alert("✅ ¡Key guardada! Ya puedes usar cualquier ticker.\n\n" +
        "Si quieres, recarga la página para ocultar este cuadro.");
  // Opcional: ocultar la tarjeta para que no moleste más
  document.getElementById("apiKeyCard").classList.add("hidden");
};

// Al cargar, si la key ya existe, escondemos la tarjeta automáticamente
if (localStorage.getItem("av_key")) {
  document.addEventListener("DOMContentLoaded", () =>
    document.getElementById("apiKeyCard").classList.add("hidden"));
}
                                    
  /* ---------- E. Chart placeholders ---------- */
  function drawPlaceholders(){
    // Frontera
    const scatterCtx = document.getElementById('scatterChart').getContext('2d');
    new Chart(scatterCtx, {
      type:'scatter',
      data:{
        datasets:[{
          label:'Portafolios simulados',
          data:Array.from({length:150},()=>({x:Math.random()*0.25+0.1,y:Math.random()*0.15+0.05})),
          backgroundColor:'rgba(109,40,217,.25)',
          pointRadius:3
        },{
          label:'Óptimo',
          data:[{x:0.18,y:0.12}],
          backgroundColor:'#E11D48',
          pointRadius:7,
          pointStyle:'star'
        }]
      },
      options:{scales:{x:{title:{display:true,text:'Volatilidad'}},y:{title:{display:true,text:'Retorno'}}},responsive:true}
    });

    // Torta
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    new Chart(pieCtx, {
      type:'pie',
      data:{labels:['AAPL','GOOG','SPY'],datasets:[{data:[40,35,25],backgroundColor:['#6D28D9','#A78BFA','#DDD6FE']}]},
      options:{responsive:true}
    });

  }

  function updateMetricCards(stats){
    if(!stats) return;
    document.getElementById('metric-ret').textContent = (stats.mean*100).toFixed(1) + '%';
    document.getElementById('metric-vol').textContent = (stats.vol*100).toFixed(1) + '%';
  }
});
