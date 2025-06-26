# --- Adaptador de red para Pyodide ---
import pyodide_http
pyodide_http.patch_all()

# --- Librerías necesarias ---
import yfinance as yf
import pandas as pd
import js

# 1. Obtener parámetros desde JavaScript
params = globals().get('params').to_py()
tickers = params["tickers"]
freq    = params["freq"]

# 2. Descargar datos históricos usando yfinance
try:
    if params.get("mode") == "preset":
        hist = yf.download(tickers, period=params["lookback"], progress=False, auto_adjust=True)
    else:
        hist = yf.download(tickers,
                           start=params["start"],
                           end=params["end"],
                           progress=False,
                           auto_adjust=True)
    prices = hist.get("Close")
except Exception as e:
    print(f"Error al descargar datos de yfinance: {e}")
    prices = None # Aseguramos que 'prices' exista aunque falle la descarga

# 3. Limpiar precios y calcular estadísticas
if prices is None or prices.empty:
    stats = {"mean": 0, "vol": 0}
    returns_df = pd.DataFrame()
else:
    if len(tickers) == 1:
        prices = prices.dropna()
    else:
        prices = prices.dropna(how='all')

    if prices.empty or len(prices) < 2:
        stats = {"mean": 0, "vol": 0}
        returns_df = pd.DataFrame()
    else:
        prices_resampled = prices.resample(freq).last().dropna()
        
        if len(prices_resampled) < 2:
            stats = {"mean": 0, "vol": 0}
            returns_df = pd.DataFrame()
        else:
            returns_df  = prices_resampled.pct_change().dropna()
            if returns_df.empty:
                stats = {"mean": 0, "vol": 0}
            else:
                mean_return = returns_df.stack().mean()
                volatility = returns_df.stack().std()
                stats = {
                    "mean": float(mean_return),
                    "vol": float(volatility)
                }

# 4. Devolver resultados a JavaScript
js.stats      = stats
js.returns_df = returns_df
