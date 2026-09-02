import { parsePhoneNumberFromString } from 'libphonenumber-js'

export interface PhoneValidationResult {
  valid: boolean
  e164: string | null
  reason?: string
}

/**
 * Normalizes a user-entered phone number to E.164. Defaults to US/CA (+1)
 * when no country code is present, which covers the primary use case
 * (personal iPhone Messages / SMS to US numbers) while still accepting any
 * explicit international number.
 */
export function validateAndNormalizePhone(raw: string, defaultCountry: 'US' = 'US'): PhoneValidationResult {
  const trimmed = (raw || '').trim()
  if (!trimmed) {
    return { valid: false, e164: null, reason: 'Phone number is required' }
  }

  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry)
  if (!parsed || !parsed.isValid()) {
    return { valid: false, e164: null, reason: 'Not a valid phone number' }
  }

  return { valid: true, e164: parsed.number }
}

export function formatPhoneForDisplay(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164)
  return parsed ? parsed.formatNational() : e164
}
