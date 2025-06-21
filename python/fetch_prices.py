# python/fetch_prices.py
import yfinance as yf
import js

# 1. Obtenemos el "embajador" (JsProxy) desde JavaScript.
# 2. Lo convertimos a un diccionario de Python real con .to_py()
params = js.params.to_py()

# Ahora 'params' es un diccionario de Python y podemos leerlo sin problemas
tickers = params["tickers"]
freq    = params["freq"]

# Look-back o fechas personalizadas (esto ya estaba perfecto)
if params.get("mode") == "preset":
    hist = yf.download(tickers, period=params["lookback"])
else:
    hist = yf.download(tickers,
                       start=params["start"],
                       end=params["end"])

# El resto del código funciona como un campeón
prices   = hist["Adj Close"].dropna()

# Si solo hay un ticker, resample puede fallar. Nos aseguramos de que funcione.
if not prices.empty:
    prices = prices.resample(freq).last()

returns  = prices.pct_change().dropna()

# Calculamos las estadísticas
# Usamos .stack().mean() y .stack().std() para que funcione bien con uno o varios tickers
stats = {
    "mean": float(returns.mean().mean()),
    "vol" : float(returns.stack().std())
}

# Devolvemos los resultados a JavaScript para pintarlos en la pantalla
js.stats      = stats
js.returns_df = returns
