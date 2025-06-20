/* PortaFolio Pro – lógica mínima (v0.2) */
document.addEventListener('DOMContentLoaded', async () => {

  /* ---------- A. Pyodide ---------- */
  const pyodideReady = loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.0/full/"
  }).then(async (py) => {
    await py.loadPackage(['numpy', 'pandas']);  // SciPy lo instalaremos después
    await py.loadPackage('micropip');
    await py.runPythonAsync(`import micropip; await micropip.install("yfinance==0.2.38")`);
    console.log('✅ Pyodide listo');
    return py;
  });

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
      const params = buildPythonInput();
      py.globals.set('params', params);
      const response = await fetch("python/fetch_prices.py");
      const code = await response.text();
      await py.runPythonAsync(code);
      const stats = py.globals.get('stats').toJs();
      updateMetricCards(stats);
    } catch (err) {
      console.error(err);
      alert('Error al obtener o ejecutar fetch_prices.py');
    }

    // 4) Dibujar gráficos placeholder
    drawPlaceholders();
    if (window.innerWidth < 1200) dashboard.scrollIntoView({behavior:'smooth'});
  });

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
