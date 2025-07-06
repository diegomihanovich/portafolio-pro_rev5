# --- Adaptador de red para Pyodide ---
import pyodide_http; pyodide_http.patch_all()

# --- Librerías ---
import pandas as pd, requests, js, asyncio, time, datetime as dt

# 0. Parámetros que llega desde JS
params  = js.params.to_py()
tickers = params["tickers"]
freq    = params["freq"]
api_key = js.window.localStorage.getItem("av_key") or "demo"  # pon tu key real

def av_url(ticker):
    return ( "https://www.alphavantage.co/query?"
             f"function=TIME_SERIES_DAILY_ADJUSTED&symbol={ticker}"
             f"&outputsize=full&apikey={api_key}" )

def get_prices(ticker):
    r = requests.get(av_url(ticker))
    data = r.json().get("Time Series (Daily)", {})
    df = (pd.DataFrame.from_dict(data, orient="index")
                    .astype(float)
                    .rename(columns={"5. adjusted close":ticker})
                    [[ticker]])
    df.index = pd.to_datetime(df.index)
    return df.sort_index()

frames = []
for i,t in enumerate(tickers, start=1):
    frames.append(get_prices(t))
    if i % 5 == 0: time.sleep(12)        # límites free: 5 llam./min

prices = pd.concat(frames, axis=1).dropna(how="all")

# -- Re‐muestreo y métricas (idéntico a tu lógica anterior) --
if prices.empty:
    stats, returns_df = {"mean":0,"vol":0}, pd.DataFrame()
else:
    prices = prices.resample(freq).last().dropna()
    returns_df = prices.pct_change().dropna()
    stats = {
        "mean": float(returns_df.stack().mean()),
        "vol" : float(returns_df.stack().std())
    }

js.py_stats      = stats
js.py_returns_df = returns_df
