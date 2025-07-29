import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logger } from '../logger'

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  it('should log debug messages in development', () => {
    logger.debug('Test debug message')
    expect(console.log).toHaveBeenCalledWith('[DEBUG]', 'Test debug message')
  })

  it('should log info messages', () => {
    logger.info('Test info message')
    expect(console.info).toHaveBeenCalledWith('[INFO]', 'Test info message')
  })

  it('should log warning messages', () => {
    logger.warn('Test warning message')
    expect(console.warn).toHaveBeenCalledWith('[WARN]', 'Test warning message')
  })

  it('should log error messages', () => {
    const error = new Error('Test error')
    logger.error('Test error message', error)
    expect(console.error).toHaveBeenCalledWith('[ERROR]', 'Test error message', error)
  })

  it('should handle objects in log messages', () => {
    const data = { key: 'value' }
    logger.info('Test with data', data)
    expect(console.info).toHaveBeenCalledWith('[INFO]', 'Test with data', data)
  })
})