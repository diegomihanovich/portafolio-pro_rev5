/* PortaFolio Pro – lógica mínima (v0.3) */
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

  let pricesChart, pieChart, scatterChart;
  function destroyCharts(){
    if (pricesChart) { pricesChart.destroy(); pricesChart = null; }
    if (pieChart)    { pieChart.destroy();    pieChart = null;    }
    if (scatterChart){ scatterChart.destroy();scatterChart = null;}
  }

  /* ---------- B. DOM refs ---------- */
  const advancedToggle = document.getElementById('advanced-toggle');
  const advancedPanel  = document.getElementById('advanced-panel');
  const lookbackSelect = document.getElementById('lookback-select');
  const customDates    = document.getElementById('custom-dates');
  const dateStartInput = document.getElementById('date-start');
  const dateEndInput   = document.getElementById('date-end');
  const optimizeBtn    = document.getElementById('optimize-btn');

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
      destroyCharts();

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
        options: { responsive: true, scales: { x: { type: 'time', time: { unit:'year' }, ticks: { maxTicksLimit: 10 } }, y: { title: { display: true, text: "Precio ajustado" } } } }
      });
      
      const pieCtx = document.getElementById('pieChart').getContext('2d');
      pieChart = new Chart(pieCtx,{
        type:'pie',
        data:{ labels: params.tickers, datasets:[{ data: datasets.map(d=>d.data.slice(-1)[0]), backgroundColor:['#6D28D9','#9333EA','#A78BFA','#C4B5FD','#DDD6FE'] }] },
        options:{responsive:true}
      });

      const statsPerTic = params.tickers.map(t=>{
        const serie = dataJS.map(r=>r[t]).filter(Boolean);
        const ret   = serie.slice(1).map((v,i)=>v/serie[i]-1);
        const media = ret.reduce((a,b)=>a+b,0)/ret.length;
        const vol   = Math.sqrt(ret.map(v => (v - media) ** 2).reduce((a,b)=>a+b,0)/ret.length);
        return {x:vol,y:media,label:t};
      });

      const scatterCtx = document.getElementById('scatterChart').getContext('2d');
      scatterChart = new Chart(scatterCtx,{
        type:'scatter',
        data:{ datasets:[{ label: 'Activos Individuales', data:statsPerTic, backgroundColor:'#6D28D9'}] },
        options:{ responsive: true, plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:ctx=>`${ctx.raw.label}: Ret. ${(ctx.raw.y*100).toFixed(1)}% / Vol. ${(ctx.raw.x*100).toFixed(1)}%` }}}}
      });

      statsProxy.destroy();

    } catch (err) {
      console.error(err);
      alert('Error al obtener o ejecutar fetch_prices.py');
    }
  });
  
  function updateMetricCards(stats){
    if(!stats) return;

    // Función auxiliar para rellenar cada tarjeta de métrica
    function metric(id, value, format) {
        const el = document.getElementById(`metric-${id}`);
        if (format === 'percent') {
            el.textContent = (value * 100).toFixed(1) + ' %';
        } else if (format === 'decimal') {
            el.textContent = value.toFixed(2);
        } else {
            el.textContent = value;
        }
    }

    metric('ret',    stats.mean,   'percent');
    metric('vol',    stats.vol,    'percent');
    metric('sharpe', stats.sharpe, 'decimal');
    metric('div',    stats.div,    'decimal');
  }

  /* --- Botón fijo al pie de la columna --- */
  const cta = document.getElementById('optimize-btn');
  const observer = new IntersectionObserver(
    ([entry]) => cta.classList.toggle('sticky', !entry.isIntersecting),
    { root:null, threshold:1 }
  );
  observer.observe(cta);
  
});
