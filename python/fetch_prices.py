# python/fetch_prices.py
import js                        #  👈  le dice a Pyodide dónde está el objeto JS
import yfinance as yf

# params llegó como variable global (un JsProxy). Lo convertimos a dict de Py.
params = js.params.to_py()       #  👈  ahora sí

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

# Devolver objetos a JS
js.stats       = stats           #  👈  ahora ‘js’ existe
js.returns_df  = returns         #  se proxifica automáticamente
