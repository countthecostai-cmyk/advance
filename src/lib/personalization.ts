// Personalization is intentionally tiny and predictable: two tokens, plain
// string replacement, sensible fallbacks so a missing last name never leaves
// a literal "{{last_name}}" in a sent message.

export interface PersonalizationFields {
  first_name?: string | null
  last_name?: string | null
}

export function personalizeMessage(template: string, fields: PersonalizationFields): string {
  const firstName = (fields.first_name || '').trim() || 'there'
  const lastName = (fields.last_name || '').trim()

  return template
    .replaceAll('{{first_name}}', firstName)
    .replaceAll('{{last_name}}', lastName)
    // Collapse a double space left behind when {{last_name}} is blank,
    // e.g. "Hi John {{last_name}}," -> "Hi John,".
    .replace(/ {2,}/g, ' ')
    .replace(/ ,/g, ',')
    .trim()
}

export function extractTokensUsed(template: string): string[] {
  const tokens = new Set<string>()
  if (template.includes('{{first_name}}')) tokens.add('{{first_name}}')
  if (template.includes('{{last_name}}')) tokens.add('{{last_name}}')
  return Array.from(tokens)
}

export const OPT_OUT_FOOTER = (optOutUrl: string) => `\n\nReply STOP to opt out, or: ${optOutUrl}`
