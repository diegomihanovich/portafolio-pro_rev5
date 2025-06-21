# python/fetch_prices.py
import yfinance as yf
import js

# La línea clave corregida:
# 1. Busca en la "sala de reuniones" de Python (globals()) al embajador ('params').
# 2. Una vez encontrado, traduce sus papeles (.to_py()).
params = globals().get('params').to_py()

# Ahora sí, 'params' es un diccionario de Python y todo lo demás funciona.
tickers = params["tickers"]
freq    = params["freq"]

# Look-back o fechas personalizadas
if params.get("mode") == "preset":
    hist = yf.download(tickers, period=params["lookback"])
else:
    hist = yf.download(tickers,
                       start=params["start"],
                       end=params["end"])

# El resto del código funciona como un campeón
# (Manejo el caso de un solo ticker para que no falle .dropna())
if len(tickers) == 1:
    prices = hist["Adj Close"].dropna()
else:
    prices = hist["Adj Close"].dropna(how='all')


# Si solo hay un ticker, resample puede fallar. Nos aseguramos de que funcione.
if not prices.empty:
    prices = prices.resample(freq).last().dropna()

returns  = prices.pct_change().dropna()

# Calculamos las estadísticas
# Usamos .stack().mean() y .stack().std() para que funcione bien con uno o varios tickers
mean_return = returns.mean().mean() if isinstance(returns, (yf.pd.Series, yf.pd.DataFrame)) and not returns.empty else 0
volatility = returns.stack().std() if isinstance(returns, yf.pd.DataFrame) and not returns.empty else (returns.std() if isinstance(returns, yf.pd.Series) and not returns.empty else 0)


stats = {
    "mean": float(mean_return),
    "vol": float(volatility)
}

# Devolvemos los resultados a JavaScript para pintarlos en la pantalla
js.stats      = stats
js.returns_df = returns
