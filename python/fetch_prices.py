import yfinance as yf
import js

# ``params`` se define desde JavaScript via ``py.globals.set('params', ...)``.
# Convertimos el objeto JS a un dict de Python.
params = params.to_py()

tickers = params["tickers"]
freq    = params["freq"]

# Look-back o fechas personalizadas
if params.get("mode") == "preset":
    hist = yf.download(tickers, period=params["lookback"])
else:
    hist = yf.download(tickers,
                       start=params["start"],
                       end=params["end"])

prices = hist["Adj Close"].dropna()
prices = prices.resample(freq).last()
returns = prices.pct_change().dropna()

stats = {
    "mean": float(returns.mean().mean()),
    "vol" : float(returns.stack().std())
}

# Devolver objetos a JS
js.stats = stats
js.returns_df = returns
