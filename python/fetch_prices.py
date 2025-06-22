# python/fetch_prices.py
import yfinance as yf
import js

# 1. Obtenemos y convertimos los parámetros de forma segura.
params = globals().get('params').to_py()

tickers = params["tickers"]
freq    = params["freq"]

# 2. Descargamos los datos históricos.
if params.get("mode") == "preset":
    hist = yf.download(tickers, period=params["lookback"], progress=False)
else:
    hist = yf.download(tickers,
                       start=params["start"],
                       end=params["end"],
                       progress=False)

# 3. Limpiamos los precios de forma cuidadosa.
prices = hist.get("Adj Close")

# Si 'prices' es None o está vacío, no podemos continuar.
if prices is None or prices.empty:
    stats = {"mean": 0, "vol": 0}
    returns_df = yf.pd.DataFrame() # Creamos un DataFrame vacío
else:
    # Si solo hay un ticker, el resultado es una Serie, no un DataFrame. Lo manejamos.
    if len(tickers) == 1:
        prices = prices.dropna()
    else:
        prices = prices.dropna(how='all')

    # Volvemos a comprobar si nos quedamos sin datos después de limpiar
    if prices.empty:
        stats = {"mean": 0, "vol": 0}
        returns_df = yf.pd.DataFrame()
    else:
        # Resampleamos a la frecuencia deseada
        prices_resampled = prices.resample(freq).last().dropna()

        # --- AQUÍ ESTÁ EL GUARDIA DE SEGURIDAD ---
        # Si tenemos menos de 2 puntos de datos, no podemos calcular retornos.
        if len(prices_resampled) < 2:
            stats = {"mean": 0, "vol": 0}
            # Creamos un DataFrame vacío de retornos para no enviar NaNs a JS
            returns_df = yf.pd.DataFrame(columns=prices_resampled.columns if isinstance(prices_resampled, yf.pd.DataFrame) else [prices_resampled.name])
        else:
            # ¡Ahora sí! Con suficientes datos, calculamos todo.
            returns_df  = prices_resampled.pct_change().dropna()
            
            # Comprobación final por si `dropna` eliminó todo
            if returns_df.empty:
                stats = {"mean": 0, "vol": 0}
            else:
                # Usamos .stack() para que el cálculo funcione igual con 1 o varios tickers
                mean_return = returns_df.stack().mean()
                volatility = returns_df.stack().std()
                stats = {
                    "mean": float(mean_return),
                    "vol": float(volatility)
                }

# 4. Devolvemos los resultados a JavaScript, asegurándonos de que todo sea un número.
js.stats      = stats
js.returns_df = returns_df
