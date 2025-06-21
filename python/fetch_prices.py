# python/fetch_prices.py
import yfinance as yf
import js                      # ⬅️ lo dejamos para devolver stats al final

params  = globals()["params"]  # ← obtenido directo del namespace Py

tickers = params["tickers"]
freq    = params["freq"]

# Look-back o fechas personalizadas
if params.get("mode") == "preset":
    hist = yf.download(tickers, period=params["lookback"])
else:
    hist = yf.download(tickers,
                       start=params["start"],
                       end=params["end"])

prices   = hist["Adj Close"].dropna()
prices   = prices.resample(freq).last()
returns  = prices.pct_change().dropna()

stats = {
    "mean": float(returns.mean().mean()),
    "vol" : float(returns.stack().std())
}

# Devolver resultados a JavaScript
js.stats      = stats
js.returns_df = returns
