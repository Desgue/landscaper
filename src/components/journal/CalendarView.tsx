import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { JournalEntry } from '../../types/schema'

export function CalendarView({
  entries,
  onDateClick,
}: {
  entries: JournalEntry[]
  onDateClick: (date: string) => void
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const daysInMonth = new Date(currentMonth.year, currentMonth.month + 1, 0).getDate()
  const firstDayOfWeek = new Date(currentMonth.year, currentMonth.month, 1).getDay()

  const entryDates = useMemo(() => {
    const dates = new Set<string>()
    entries.forEach((e) => dates.add(e.date))
    return dates
  }, [entries])

  const prevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 }
      return { year: prev.year, month: prev.month - 1 }
    })
  }

  const nextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 }
      return { year: prev.year, month: prev.month + 1 }
    })
  }

  const monthName = new Date(currentMonth.year, currentMonth.month).toLocaleDateString(
    'en-US',
    { month: 'long', year: 'numeric' },
  )

  const days: (number | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  return (
    <div className="max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-gray-700">{monthName}</span>
        <button onClick={nextMonth} className="text-gray-400 hover:text-gray-600">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-xs text-gray-400 font-medium py-1">
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />
          const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const hasEntries = entryDates.has(dateStr)
          return (
            <button
              key={dateStr}
              className={`text-xs py-1.5 rounded ${
                hasEntries
                  ? 'bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => hasEntries && onDateClick(dateStr)}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
