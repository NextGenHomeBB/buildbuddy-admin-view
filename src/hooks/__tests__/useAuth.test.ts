import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuth } from '../useAuth'
import { supabase } from '@/integrations/supabase/client'

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAuth())
    
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBe(null)
    expect(result.current.session).toBe(null)
  })

  it('should handle sign out', async () => {
    const mockSignOut = vi.mocked(supabase.auth.signOut)
    mockSignOut.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth())
    
    await result.current.signOut()
    
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('should determine admin status correctly', () => {
    const { result } = renderHook(() => useAuth())
    
    // Test with admin user
    result.current.user = { role: 'admin' } as any
    expect(result.current.isAdmin).toBe(true)
    
    // Test with non-admin user
    result.current.user = { role: 'worker' } as any
    expect(result.current.isAdmin).toBe(false)
  })
})