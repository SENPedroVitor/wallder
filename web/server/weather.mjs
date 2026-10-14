const cache = new Map()
export async function getWeather(city, { fetchImpl = fetch, now = Date.now } = {}) {
  if (typeof city !== 'string' || !city.trim() || city.length > 100) throw Object.assign(new Error('Informe uma cidade com até 100 caracteres.'), { status: 400 })
  const name = city.trim(), key = name.toLocaleLowerCase('pt-BR'), cached = cache.get(key)
  if (fetchImpl === fetch && cached && now() - cached.at < 600000) return cached.data
  const request = async url => {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(15000) })
    if (!response.ok) throw Object.assign(new Error('O serviço de clima não respondeu. Tente novamente.'), { status: 502 })
    return response.json()
  }
  const geo = await request('https://geocoding-api.open-meteo.com/v1/search?' + new URLSearchParams({ name, count: '1', language: 'pt', format: 'json' }))
  const place = geo.results?.[0]
  if (!place || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) throw Object.assign(new Error('Não encontrei esta cidade. Informe cidade e estado.'), { status: 404 })
  const weather = await request('https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({ latitude: String(place.latitude), longitude: String(place.longitude), current: 'temperature_2m,apparent_temperature,wind_speed_10m,weather_code', hourly: 'temperature_2m,precipitation_probability,weather_code', daily: 'temperature_2m_min,temperature_2m_max,weather_code', forecast_days: '7', timezone: 'auto' }))
  if (!weather.current || !Array.isArray(weather.hourly?.time) || !Array.isArray(weather.daily?.time)) throw Object.assign(new Error('A previsão retornou dados incompletos.'), { status: 502 })
  const start = Math.max(0, weather.hourly.time.findIndex(time => time >= weather.current.time))
  const hourly = weather.hourly.time.map((time, i) => ({ time, temperature: weather.hourly.temperature_2m[i], rain: weather.hourly.precipitation_probability[i], code: weather.hourly.weather_code[i] })).slice(start).filter((_, i) => i % 3 === 0).slice(0, 6)
  const daily = weather.daily.time.map((time, i) => ({ time, min: weather.daily.temperature_2m_min[i], max: weather.daily.temperature_2m_max[i], code: weather.daily.weather_code[i] }))
  const data = { city: place.name, updated: new Date(now()).toISOString(), current: { temperature: weather.current.temperature_2m, apparent: weather.current.apparent_temperature, wind: weather.current.wind_speed_10m, code: weather.current.weather_code }, hourly, daily }
  if (fetchImpl === fetch) { if (cache.size > 100) cache.clear(); cache.set(key, { at: now(), data }) }
  return data
}
