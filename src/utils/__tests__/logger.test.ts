import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLogger, _resetLoggerCache } from '../logger'

function mockLocalStorage(data: Record<string, string>) {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data[key] ?? null,
    setItem: vi.fn(),
    removeItem: vi.fn(),
  })
}

beforeEach(() => {
  _resetLoggerCache()
  vi.restoreAllMocks()
})

describe('createLogger', () => {
  it('suppresses debug and info at default warn level', () => {
    mockLocalStorage({})
    const log = createLogger('Test')
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    log.debug('d')
    log.info('i')
    log.warn('w')

    expect(debugSpy).not.toHaveBeenCalled()
    expect(infoSpy).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith('[Test] w')
  })

  it('enables all levels when LOG_LEVEL=debug', () => {
    mockLocalStorage({ LOG_LEVEL: 'debug' })
    const log = createLogger('All')
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    log.debug('d')
    log.info('i')

    expect(debugSpy).toHaveBeenCalledWith('[All] d')
    expect(infoSpy).toHaveBeenCalledWith('[All] i')
  })

  it('suppresses everything when LOG_LEVEL=silent', () => {
    mockLocalStorage({ LOG_LEVEL: 'silent' })
    const log = createLogger('Silent')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    log.error('e')

    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('force-enables debug for namespaces listed in LOG_MODULES', () => {
    mockLocalStorage({ LOG_LEVEL: 'warn', LOG_MODULES: 'SSM,SnapSystem' })
    const ssmLog = createLogger('SSM')
    const otherLog = createLogger('Other')
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    ssmLog.debug('transition')
    otherLog.debug('hidden')

    expect(debugSpy).toHaveBeenCalledTimes(1)
    expect(debugSpy).toHaveBeenCalledWith('[SSM] transition')
  })

  it('passes structured data as second console arg', () => {
    mockLocalStorage({ LOG_LEVEL: 'debug' })
    const log = createLogger('Data')
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    const payload = { x: 1, y: 2 }
    log.debug('point', payload)

    expect(debugSpy).toHaveBeenCalledWith('[Data] point', payload)
  })

  it('caches logger instances by namespace', () => {
    mockLocalStorage({ LOG_LEVEL: 'debug' })
    const a = createLogger('Cache')
    const b = createLogger('Cache')
    expect(a).toBe(b)
  })
})
