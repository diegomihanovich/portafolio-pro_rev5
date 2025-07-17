# fetch_prices.py  (sin API-key)
import pyodide_http ; pyodide_http.patch_all()

import pandas as pd, requests, js, asyncio

# ----------------- parámetros pasados desde JS ------------------
raw = globals().get("params", {})
if hasattr(raw, "to_py"):        # Pyodide ≥0.23
    params = raw.to_py()
else:
    params = raw if isinstance(raw, dict) else {}

tickers = params.get("tickers", [])      # ["MSFT", "GOOG", …]
freq    = params.get("freq", "D").lower()  # 'd','w','m'

# --------------------- helpers ----------------------------------
def stooq_url(ticker):
    sym = ticker.lower() + ".us"         # ← ajusta aquí tu mercado
    return f"https://stooq.com/q/d/l/?s={sym}&i={freq}"

def get_prices(ticker):
    url = stooq_url(ticker)
    try:
        df = pd.read_csv(url)
    except Exception:
        return pd.DataFrame()

    if df.empty or "Close" not in df.columns:
        return pd.DataFrame()

    df = (df.rename(columns={"Close": ticker})
            .loc[:, ["Date", ticker]])
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.set_index("Date").sort_index()
    return df

# ------------------- descarga -----------------------------------
frames = [get_prices(t) for t in tickers]
prices = pd.concat(frames, axis=1).dropna(how="all")

# ------------------- estadísticos -------------------------------
if prices.empty:
    stats, returns_df = {"mean": 0.0, "vol": 0.0}, pd.DataFrame()
else:
    returns_df = prices.pct_change().dropna()
    stats = {
        "mean": float(returns_df.stack().mean()),
        "vol":  float(returns_df.stack().std()),
    }

# ------------------- expone a JavaScript ------------------------
js.py_stats      = stats
js.py_returns_df = returns_df
