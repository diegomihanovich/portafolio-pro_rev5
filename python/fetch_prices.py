import pyodide_http; pyodide_http.patch_all()
import pandas as pd, requests, js, asyncio, io, textwrap

raw = globals().get("params", {})
params = raw.to_py() if hasattr(raw, "to_py") else (raw if isinstance(raw, dict) else {})
tickers = params.get("tickers", [])
freq    = params.get("freq", "d").lower()           # 'd','w','m'

def stooq_url(ticker):
    sym  = ticker.lower() + ".us"
    base = f"https://stooq.com/q/d/l/?s={sym}&i={freq}"
    return "https://api.allorigins.win/raw?url=" + base   # proxy CORS

def get_prices(t):
    try:
        df = pd.read_csv(stooq_url(t))
    except Exception:
        return pd.DataFrame()
    if df.empty or "Close" not in df.columns:
        return pd.DataFrame()
    df = df.rename(columns={"Close": t})[["Date", t]]
    df["Date"] = pd.to_datetime(df["Date"])
    return df.set_index("Date").sort_index()

frames  = [get_prices(t) for t in tickers]
prices  = pd.concat(frames, axis=1).dropna(how="all")

if prices.empty:
    stats, returns_df = {"mean": 0.0, "vol": 0.0}, pd.DataFrame()
else:
    returns_df = prices.pct_change().dropna()
    stats = {"mean": float(returns_df.stack().mean()),
             "vol":  float(returns_df.stack().std())}

# --------- resultados hacia JavaScript ---------
js.py_stats      = stats
js.py_returns_df = returns_df
js.py_prices     = prices          #  ←  NUEVO
