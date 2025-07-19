/* PortaFolio Pro – lógica mínima (v0.2) */
document.addEventListener('DOMContentLoaded', async () => {

  /* ---------- A. Pyodide ---------- */
  const pyodideReady = loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.0/full/"
  }).then(async (py) => {
    await py.loadPackage(['numpy', 'pandas', 'requests', 'pyodide-http']);
    await py.loadPackage('micropip');
    console.log('✅ Pyodide listo');
    return py;
  });
  window.pyodideReady = pyodideReady;

  let pricesChart;
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
  const dashboard      = document.getElementById('dashboard'); // La referencia se mantiene, pero ya no se usa para ocultar/mostrar.

  /* ---------- C. UI behaviours ---------- */
  advancedToggle.addEventListener('change', () =>
    advancedPanel.classList.toggle('hidden', !advancedToggle.checked)
  );

  lookbackSelect.addEventListener('change', e =>
    customDates.classList.toggle('hidden', e.target.value !== 'custom')
  );

  function buildPythonInput(){
    const tickers = document.getElementById('tickers-input').value
      .split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
    const freq = document.getElementById('freq-select').value;
    const rf   = parseFloat(document.getElementById('rf-input').value) || 0;
    const lookback = lookbackSelect.value;
    if(lookback !== 'custom'){
      return {tickers, freq, rf, mode:'preset', lookback};
    }
    return { tickers, freq, rf, mode:'custom', start: dateStartInput.value, end: dateEndInput.value };
  }

  /* ---------- D. Optimize ---------- */
  optimizeBtn.addEventListener('click', async () => {
    const tickers = document.getElementById('tickers-input').value
      .split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
    if (tickers.length === 0) { alert('Ingresa al menos un ticker'); return; }
    if (tickers.length > 20)  { alert('Máximo 20 activos'); return; }

    // ▼▼▼ CAMBIO 2-B: La línea que mostraba el dashboard se eliminó de aquí. ▼▼▼
    
    try {
      const py = await pyodideReady;
      const params = buildPythonInput();
      py.globals.set('params', params);

      const response = await fetch("python/fetch_prices.py");
      const code     = await response.text();
      try {
        await py.runPythonAsync(code);
      } catch (err) {
        console.error(err);
        alert('Uy, Python explotó: ' + err);
        throw err;
      }

      const statsProxy  = py.globals.get("stats");
      const pricesJSON  = window.py_prices_json;
      const stats = statsProxy.toJs();
      updateMetricCards(stats);

      destroyChart();
      const dataJS  = JSON.parse(pricesJSON);
      const labels = dataJS.map(r => new Date(r.Date));
      const datasets = params.tickers.map(t => ({
        label : t,
        data  : dataJS.map(r => r[t]),
        fill  : false
      }));

      pricesChart = new Chart(document.getElementById("pricesChart"), {
        type: "line",
        data: { labels, datasets },
        options: {
          responsive: true,
          scales: {
            x: { type: 'time', time: { unit:'year' }, ticks: { maxTicksLimit: 10 } },
            y: { title: { display: true, text: "Precio ajustado" } }
          }
        }
      });
      statsProxy.destroy();

    } catch (err) {
      console.error(err);
      alert('Error al obtener o ejecutar fetch_prices.py');
    }
  });

  // ▼▼▼ CAMBIO 2-A: Todo el código que manejaba la API Key (guardarKey y el check de localStorage) ha sido eliminado de aquí. ▼▼▼

  /* ---------- E. Chart placeholders ---------- */
  drawPlaceholders(); // Ahora llamamos a los placeholders al cargar la página.
  
  function drawPlaceholders(){
    const scatterCtx = document.getElementById('scatterChart').getContext('2d');
    new Chart(scatterCtx, {type:'scatter',data:{datasets:[{label:'Portafolios simulados',data:Array.from({length:150},()=>({x:Math.random()*0.25+0.1,y:Math.random()*0.15+0.05})),backgroundColor:'rgba(109,40,217,.25)',pointRadius:3},{label:'Óptimo',data:[{x:0.18,y:0.12}],backgroundColor:'#E11D48',pointRadius:7,pointStyle:'star'}]},options:{scales:{x:{title:{display:true,text:'Volatilidad'}},y:{title:{display:true,text:'Retorno'}}},responsive:true}});
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    new Chart(pieCtx, {type:'pie',data:{labels:['AAPL','GOOG','SPY'],datasets:[{data:[40,35,25],backgroundColor:['#6D28D9','#A78BFA','#DDD6FE']}]},options:{responsive:true}});
  }
  
  function updateMetricCards(stats){
    if(!stats) return;
    document.getElementById('metric-ret').textContent = (stats.mean*100).toFixed(1) + '%';
    document.getElementById('metric-vol').textContent = (stats.vol*100).toFixed(1) + '%';
  }

  // ▼▼▼ CAMBIO 2-C: Código nuevo para el botón "sticky". ▼▼▼
  /* --- Botón fijo al pie de la columna --- */
  const cta = document.getElementById('optimize-btn');
  const observer = new IntersectionObserver(
    ([entry]) => cta.classList.toggle('sticky', !entry.isIntersecting),
    { root:null, threshold:1 }
  );
  observer.observe(cta);
  
});
