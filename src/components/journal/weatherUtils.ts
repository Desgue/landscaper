import { Sun, CloudSun, Cloud, CloudRain, CloudSnow, Wind } from 'lucide-react'
import type { WeatherCondition, WeatherData } from '../../types/schema'

export const WEATHER_ICONS: Record<WeatherCondition, typeof Sun> = {
  sunny: Sun,
  'partly-cloudy': CloudSun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: CloudSnow,
  windy: Wind,
}

export const WEATHER_CONDITIONS: WeatherCondition[] = [
  'sunny', 'partly-cloudy', 'cloudy', 'rainy', 'snowy', 'windy',
]

export function mapWmoToCondition(code: number): WeatherCondition {
  if (code <= 1) return 'sunny'
  if (code <= 3) return 'partly-cloudy'
  if (code <= 48) return 'cloudy'
  if (code <= 67) return 'rainy'
  if (code <= 77) return 'snowy'
  if (code <= 82) return 'rainy'
  if (code <= 86) return 'snowy'
  return 'windy'
}

export async function fetchWeather(
  lat: number,
  lng: number,
): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&current=temperature_2m,relative_humidity_2m,weather_code`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const current = data?.current
    if (!current || typeof current !== 'object') return null

    const tempRaw = current.temperature_2m
    const humRaw = current.relative_humidity_2m
    const codeRaw = current.weather_code

    return {
      tempC: typeof tempRaw === 'number' && isFinite(tempRaw) && tempRaw >= -100 && tempRaw <= 100
        ? tempRaw : null,
      condition: mapWmoToCondition(typeof codeRaw === 'number' ? codeRaw : 0),
      humidity: typeof humRaw === 'number' && isFinite(humRaw) && humRaw >= 0 && humRaw <= 100
        ? Math.round(humRaw) : null,
    }
  } catch {
    return null
  }
}

