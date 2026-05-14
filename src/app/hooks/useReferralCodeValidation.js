import { useEffect, useState } from 'react'
import { referralService, unwrapReferralResponse } from '../../services/referral.service.js'

/**
 * Debounced server check for optional signup referral field (POST /referral/validate-referral-code).
 * When `enabled` is false or code length is not 4–16, status stays idle.
 */
export function useReferralCodeValidation(code, enabled) {
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!enabled) {
      setStatus('idle')
      setMessage('')
      return undefined
    }

    const normalized = String(code ?? '')
      .trim()
      .toUpperCase()
      .replace(/\s/g, '')

    if (normalized.length === 0) {
      setStatus('idle')
      setMessage('')
      return undefined
    }
    if (normalized.length < 4 || normalized.length > 16) {
      setStatus('idle')
      setMessage('')
      return undefined
    }

    let cancelled = false

    const timer = setTimeout(() => {
      setStatus('checking')
      referralService
        .validateReferralCode(normalized)
        .then((res) => {
          if (cancelled) return
          const data = unwrapReferralResponse(res)
          if (data?.valid) {
            setStatus('valid')
            setMessage('This code is valid.')
          } else {
            setStatus('invalid')
            const r = data?.reason
            if (r === 'REFERRAL_DISABLED') {
              setMessage('Referral program is not available right now.')
            } else if (r === 'INVALID_CODE') {
              setMessage('We could not find this referral code.')
            } else {
              setMessage('Invalid referral code.')
            }
          }
        })
        .catch(() => {
          if (cancelled) return
          setStatus('idle')
          setMessage('')
        })
    }, 450)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [code, enabled])

  return { status, message }
}
