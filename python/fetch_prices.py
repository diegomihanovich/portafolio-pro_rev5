import pyodide_http
pyodide_http.patch_all()

import pandas as pd
import requests
import js
import asyncio
import io
import textwrap
import urllib.parse
import numpy as np  # <--- Módulo necesario

raw = globals().get("params", {})
params = raw.to_py() if hasattr(raw, "to_py") else (raw if isinstance(raw, dict) else {})
tickers = params.get("tickers", [])
freq = params.get("freq", "d").lower()

def stooq_url(ticker):
    sym = ticker.lower() + ".us"
    base = f"https://stooq.com/q/d/l/?s={sym}&i={freq}"
    encoded = urllib.parse.quote(base, safe="")
    return "https://api.allorigins.win/raw?url=" + encoded

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

frames = [get_prices(t) for t in tickers]
prices = pd.concat(frames, axis=1).dropna(how="all")

# --- Este es el bloque que hemos mejorado ---
if prices.empty or len(prices) < 2:
    stats = {"mean": 0.0, "vol": 0.0, "sharpe": 0.0, "div": 0.0}
    returns_df = pd.DataFrame()
else:
    returns_df = prices.pct_change().dropna()
    stats = {
        "mean": float(returns_df.stack().mean()),
        "vol": float(returns_df.stack().std())
    }
    # Calcular Sharpe (evitando división por cero)
    stats["sharpe"] = (stats["mean"] / stats["vol"]) if stats["vol"] > 0 else 0.0
    
    # Calcular Diversificación (solo si hay más de 1 activo)
    if len(returns_df.columns) > 1:
        corr = returns_df.corr().where(~np.eye(len(returns_df.columns), dtype=bool)).stack()
        stats["div"] = float(1 - corr.mean())
    else:
        stats["div"] = 0.0 # No hay diversificación con un solo activo

# --------- resultados hacia JavaScript ---------
js.py_stats = stats
js.py_returns_df = returns_df
js.py_prices = prices
js.py_prices_json = prices.reset_index().to_json(orient="records")
