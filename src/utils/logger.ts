type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
}

function getGlobalLevel(): LogLevel {
  try {
    const raw = localStorage.getItem('LOG_LEVEL')
    if (raw && raw in LEVEL_ORDER) return raw as LogLevel
  } catch { /* SSR or restricted storage */ }
  return 'warn'
}

function getEnabledModules(): Set<string> {
  try {
    const raw = localStorage.getItem('LOG_MODULES')
    if (raw) return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))
  } catch { /* SSR or restricted storage */ }
  return new Set()
}

export interface Logger {
  debug(message: string, data?: unknown): void
  info(message: string, data?: unknown): void
  warn(message: string, data?: unknown): void
  error(message: string, data?: unknown): void
}

const cache = new Map<string, Logger>()

export function createLogger(namespace: string): Logger {
  const cached = cache.get(namespace)
  if (cached) return cached

  const globalLevel = getGlobalLevel()
  const enabledModules = getEnabledModules()
  const moduleForced = enabledModules.has(namespace)

  function shouldLog(level: LogLevel): boolean {
    if (moduleForced) return true
    return LEVEL_ORDER[level] >= LEVEL_ORDER[globalLevel]
  }

  const logger: Logger = {
    debug(message: string, data?: unknown) {
      if (!shouldLog('debug')) return
      if (data !== undefined) console.debug(`[${namespace}] ${message}`, data)
      else console.debug(`[${namespace}] ${message}`)
    },
    info(message: string, data?: unknown) {
      if (!shouldLog('info')) return
      if (data !== undefined) console.info(`[${namespace}] ${message}`, data)
      else console.info(`[${namespace}] ${message}`)
    },
    warn(message: string, data?: unknown) {
      if (!shouldLog('warn')) return
      if (data !== undefined) console.warn(`[${namespace}] ${message}`, data)
      else console.warn(`[${namespace}] ${message}`)
    },
    error(message: string, data?: unknown) {
      if (!shouldLog('error')) return
      if (data !== undefined) console.error(`[${namespace}] ${message}`, data)
      else console.error(`[${namespace}] ${message}`)
    },
  }

  cache.set(namespace, logger)
  return logger
}

/** Clear cached loggers (useful for tests when localStorage changes). */
export function _resetLoggerCache(): void {
  cache.clear()
}
