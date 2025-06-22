# python/fetch_prices.py
import yfinance as yf
import pandas as pd  # <--- ¡AQUÍ ESTÁ LA LÍNEA CLAVE QUE FALTABA!
import js

# 1. Obtenemos y convertimos los parámetros de forma segura.
params = globals().get('params').to_py()

tickers = params["tickers"]
freq    = params["freq"]

# 2. Descargamos los datos históricos.
if params.get("mode") == "preset":
    hist = yf.download(tickers, period=params["lookback"], progress=False, auto_adjust=True)
else:
    hist = yf.download(tickers,
                       start=params["start"],
                       end=params["end"],
                       progress=False,
                       auto_adjust=True)

# 3. Limpiamos los precios de forma cuidadosa.
# Usamos 'Close' porque auto_adjust=True ya ajusta los precios.
prices = hist.get("Close")

# Si 'prices' es None o está vacío, no podemos continuar.
if prices is None or prices.empty:
    stats = {"mean": 0, "vol": 0}
    returns_df = pd.DataFrame() # <-- Usamos pd, no yf.pd
else:
    # Si solo hay un ticker, el resultado es una Serie, no un DataFrame. Lo manejamos.
    if len(tickers) == 1:
        prices = prices.dropna()
    else:
        prices = prices.dropna(how='all')

    # Volvemos a comprobar si nos quedamos sin datos después de limpiar
    if prices.empty:
        stats = {"mean": 0, "vol": 0}
        returns_df = pd.DataFrame() # <-- Usamos pd, no yf.pd
    else:
        # Resampleamos a la frecuencia deseada
        prices_resampled = prices.resample(freq).last().dropna()

        # --- El Guardia de Seguridad ---
        if len(prices_resampled) < 2:
            stats = {"mean": 0, "vol": 0}
            returns_df = pd.DataFrame(columns=prices_resampled.columns if isinstance(prices_resampled, pd.DataFrame) else [prices_resampled.name]) # <-- Usamos pd
        else:
            # ¡Ahora sí! Con suficientes datos, calculamos todo.
            returns_df  = prices_resampled.pct_change().dropna()
            
            if returns_df.empty:
                stats = {"mean": 0, "vol": 0}
            else:
                mean_return = returns_df.stack().mean()
                volatility = returns_df.stack().std()
                stats = {
                    "mean": float(mean_return),
                    "vol": float(volatility)
                }

# 4. Devolvemos los resultados a JavaScript.
js.stats      = stats
js.returns_df = returns_df
