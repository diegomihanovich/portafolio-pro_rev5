/* PortaFolio Pro – lógica mínima (v0.2) */
document.addEventListener('DOMContentLoaded', async () => {

  /* ---------- A. Pyodide ---------- */
  const pyodideReady = loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.0/full/"
  }).then(async (py) => {
    await py.loadPackage(['numpy', 'pandas']);  // SciPy lo instalaremos después
    console.log('✅ Pyodide listo');
    return py;
  });

  /* ---------- B. DOM refs ---------- */
  const advancedToggle = document.getElementById('advanced-toggle');
  const advancedPanel  = document.getElementById('advanced-panel');
  const lookbackSelect = document.getElementById('lookback-select');
  const customDates    = document.getElementById('custom-dates');
  const optimizeBtn    = document.getElementById('optimize-btn');
  const dashboard      = document.getElementById('dashboard');

  /* ---------- C. UI behaviours ---------- */
  advancedToggle.addEventListener('change', () =>
    advancedPanel.classList.toggle('hidden', !advancedToggle.checked)
  );

  lookbackSelect.addEventListener('change', e =>
    customDates.classList.toggle('hidden', e.target.value !== 'custom')
  );

  /* ---------- D. Optimize (placeholder) ---------- */
  optimizeBtn.addEventListener('click', async () => {
    // 1) Validaciones rápidas
    const tickers = document.getElementById('tickers-input').value
      .split(',')
      .map(t => t.trim().toUpperCase())
      .filter(Boolean);
    if (tickers.length === 0) { alert('Ingresa al menos un ticker'); return; }
    if (tickers.length > 20)  { alert('Máximo 20 activos'); return; }

    // 2) Mostrar “dashboard” y dibujar gráficos fake (por ahora)
    dashboard.style.display = 'block';
    drawPlaceholders();
    if (window.innerWidth < 1200) dashboard.scrollIntoView({behavior:'smooth'});

    // 3) Aquí pondremos la magia Python ↘️
    /*
    const py = await pyodideReady;
    py.globals.set('tickers', tickers);
    await py.runPythonAsync(`
        import pandas as pd, js
        # TODO: descargar precios con yfinance y hacer Markowitz
        result = {'ret': 0.12, 'vol': 0.18, 'sharpe': 0.67}
        js.document.getElementById('metric-ret').textContent    = f"{result['ret']*100:.1f}%"
        js.document.getElementById('metric-vol').textContent    = f"{result['vol']*100:.1f}%"
        js.document.getElementById('metric-sharpe').textContent = f"{result['sharpe']:.2f}"
    `);
    */
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

    // Métricas demo
    document.getElementById('metric-ret').textContent    = '12.5%';
    document.getElementById('metric-vol').textContent    = '18.2%';
    document.getElementById('metric-sharpe').textContent = '0.68';
    document.getElementById('metric-div').textContent    = '🟧 Medio';
  }
});
