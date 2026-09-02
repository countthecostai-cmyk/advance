import Papa from 'papaparse'
import { validateAndNormalizePhone } from '@/lib/phone'
import { CSV_IMPORT_MAX_ROWS } from '@/lib/constants'

export interface ParsedContactRow {
  row: number
  first_name: string
  last_name: string
  phone_number: string // normalized E.164, empty string if invalid
  notes: string
  group: string
  consent_status: 'unknown' | 'given' | 'implied' | 'declined'
  valid: boolean
  error?: string
}

const HEADER_ALIASES: Record<string, string> = {
  firstname: 'first_name',
  'first name': 'first_name',
  first: 'first_name',
  lastname: 'last_name',
  'last name': 'last_name',
  last: 'last_name',
  phone: 'phone_number',
  phonenumber: 'phone_number',
  'phone number': 'phone_number',
  mobile: 'phone_number',
  cell: 'phone_number',
  note: 'notes',
  notes: 'notes',
  group: 'group',
  groups: 'group',
  tag: 'group',
  consent: 'consent_status',
  'consent status': 'consent_status',
  consentstatus: 'consent_status',
}

function normalizeHeader(h: string): string {
  const key = h.trim().toLowerCase()
  return HEADER_ALIASES[key] || key
}

export interface CsvParseResult {
  rows: ParsedContactRow[]
  truncated: boolean
  totalRows: number
}

export function parseContactsCsv(csvText: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  })

  const totalRows = parsed.data.length
  const truncated = totalRows > CSV_IMPORT_MAX_ROWS
  const dataRows = parsed.data.slice(0, CSV_IMPORT_MAX_ROWS)

  const rows: ParsedContactRow[] = dataRows.map((raw, i) => {
    const first_name = (raw.first_name || '').trim()
    const last_name = (raw.last_name || '').trim()
    const notes = (raw.notes || '').trim()
    const group = (raw.group || '').trim()
    const consentRaw = (raw.consent_status || 'unknown').trim().toLowerCase()
    const consent_status = (['given', 'implied', 'declined'].includes(consentRaw) ? consentRaw : 'unknown') as
      | 'unknown'
      | 'given'
      | 'implied'
      | 'declined'

    if (!first_name) {
      return {
        row: i + 2, // account for header row + 1-index
        first_name,
        last_name,
        phone_number: '',
        notes,
        group,
        consent_status,
        valid: false,
        error: 'Missing first name',
      }
    }

    const phoneResult = validateAndNormalizePhone(raw.phone_number || '')
    if (!phoneResult.valid || !phoneResult.e164) {
      return {
        row: i + 2,
        first_name,
        last_name,
        phone_number: '',
        notes,
        group,
        consent_status,
        valid: false,
        error: phoneResult.reason || 'Invalid phone number',
      }
    }

    return {
      row: i + 2,
      first_name,
      last_name,
      phone_number: phoneResult.e164,
      notes,
      group,
      consent_status,
      valid: true,
    }
  })

  return { rows, truncated, totalRows }
}

export function contactsToCsv(
  contacts: Array<{
    first_name: string
    last_name: string
    phone_number: string
    notes: string
    consent_status: string
    opted_out: boolean
    groups?: Array<{ name: string }>
  }>
): string {
  const data = contacts.map((c) => ({
    first_name: c.first_name,
    last_name: c.last_name,
    phone_number: c.phone_number,
    group: (c.groups || []).map((g) => g.name).join('; '),
    notes: c.notes,
    consent_status: c.consent_status,
    opted_out: c.opted_out ? 'true' : 'false',
  }))
  return Papa.unparse(data)
}
