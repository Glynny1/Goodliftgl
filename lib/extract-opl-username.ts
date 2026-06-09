export function extractOplUsername(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''

  // Extract from a full or partial URL: openpowerlifting.org/u/{username}
  const match = trimmed.match(/openpowerlifting\.org\/u\/([^/?#\s]+)/i)
  if (match) return match[1].toLowerCase()

  // Plain username — strip any accidental slashes
  return trimmed.replace(/\//g, '').toLowerCase()
}
