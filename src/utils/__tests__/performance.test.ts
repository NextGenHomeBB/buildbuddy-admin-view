import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { measurePerformance, debounce, throttle } from '../performance'

describe('Performance Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('measurePerformance', () => {
    it('should measure sync operation performance', () => {
      const operation = vi.fn(() => 'result')
      const result = measurePerformance('test-operation', operation)
      
      expect(result).toBe('result')
      expect(operation).toHaveBeenCalledOnce()
    })
  })

  describe('debounce', () => {
    it('should debounce function calls', () => {
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 100)
      
      debouncedFn()
      debouncedFn()
      debouncedFn()
      
      expect(mockFn).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalledOnce()
    })
  })

  describe('throttle', () => {
    it('should throttle function calls', () => {
      const mockFn = vi.fn()
      const throttledFn = throttle(mockFn, 100)
      
      throttledFn()
      throttledFn()
      throttledFn()
      
      expect(mockFn).toHaveBeenCalledOnce()
      
      vi.advanceTimersByTime(100)
      throttledFn()
      expect(mockFn).toHaveBeenCalledTimes(2)
    })
  })
})