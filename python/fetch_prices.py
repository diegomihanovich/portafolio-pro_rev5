import yfinance as yf, pandas as pd, datetime as dt, js, params

tickers = params["tickers"]
freq = params["freq"]

if params["mode"] == "preset":
    hist = yf.download(tickers, period=params["lookback"])
else:
    hist = yf.download(tickers, start=params["start"], end=params["end"])

prices = hist['Adj Close'].dropna()
prices = prices.resample(freq).last()
returns = prices.pct_change().dropna()

stats = {
    "mean": float(returns.mean().mean()),
    "vol": float(returns.stack().std())
}

js.stats = stats
js.returns_df = returns
