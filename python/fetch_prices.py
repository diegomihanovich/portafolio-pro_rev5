# fetch_prices.py  👈 cópialo tal cual
# -----------------------------------------------------------------------------
# 1) Adaptador de red para que requests → fetch del navegador
import pyodide_http; pyodide_http.patch_all()

# 2) Librerías estándar
import pandas as pd, requests, js, asyncio, time

# -----------------------------------------------------------------
# 3) Parámetros enviados desde JavaScript --------------------------
raw = globals().get("params", {})

#  🔄  Convierte el proxy JS → dict de Python si hace falta
if hasattr(raw, "to_py"):            # Pyodide ≥ 0.23 tiene .to_py()
    params = raw.to_py()
elif isinstance(raw, dict):          # ya es dict
    params = raw
else:                                # último recurso: lo dejamos vacío
    params = {}

tickers = params.get("tickers", [])
freq    = params.get("freq", "D")    # "D" diario, "M" mensual...


# 4) Clave de Alpha Vantage (la tuya o la demo)
api_key = js.window.localStorage.getItem("av_key") or "PF06Z4B1IVQX59NQ"

# 5) Helpers -------------------------------------------------------
def av_url(ticker):
    return (
        "https://www.alphavantage.co/query?"
        f"function=TIME_SERIES_DAILY_ADJUSTED&symbol={ticker}"
        f"&outputsize=full&apikey={api_key}"
    )

def get_prices(ticker):
    """Devuelve un DataFrame con la serie de precios ajustados."""
    r    = requests.get(av_url(ticker))
    data = r.json().get("Time Series (Daily)", {})
    if not data:                      # API agotada o ticker no válido
        return pd.DataFrame()         # devuelve vacío → se filtra luego
    df = (pd.DataFrame.from_dict(data, orient="index")
            .rename(columns={"5. adjusted close": ticker})
            [[ticker]]
            .astype(float))
    df.index = pd.to_datetime(df.index)
    return df.sort_index()

# 6) Descarga de todos los tickers con pausa cada 5 llamadas -------
frames = []
for i, tck in enumerate(tickers, start=1):
    frames.append(get_prices(tck))
    if i % 5 == 0:
        await asyncio.sleep(12)       # 5 peticiones/min en plan free

prices = pd.concat(frames, axis=1).dropna(how="all")

# 7) Cálculo de retornos y estadísticos ----------------------------
if prices.empty:
    stats       = {"mean": 0.0, "vol": 0.0}
    returns_df  = pd.DataFrame()
else:
    prices      = prices.resample(freq).last().dropna()
    returns_df  = prices.pct_change().dropna()
    stats       = {
        "mean": float(returns_df.stack().mean()),
        "vol":  float(returns_df.stack().std())
    }

# 8) Dejamos los resultados para JS --------------------------------
js.py_stats      = stats
js.py_returns_df = returns_df
