import { CloudSun } from 'lucide-react'
import type { WeatherData } from '../../types/schema'
import { WEATHER_ICONS } from './weatherUtils'

export function WeatherDisplay({ weather }: { weather: WeatherData }) {
  const Icon = weather.condition ? WEATHER_ICONS[weather.condition] : CloudSun
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <Icon size={14} />
      {weather.tempC !== null && <span>{weather.tempC}°C</span>}
      {weather.condition && (
        <span className="capitalize">{weather.condition.replace('-', ' ')}</span>
      )}
      {weather.humidity !== null && <span>{weather.humidity}%</span>}
    </div>
  )
}
