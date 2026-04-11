export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function unescapeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export function safeHref(escapedRaw: string): string {
  // Input is already HTML-escaped from renderMarkdown; unescape for URL validation
  const raw = unescapeHtml(escapedRaw)
  try {
    const url = new URL(raw)
    if (['http:', 'https:', 'mailto:'].includes(url.protocol)) return escapeHtml(raw)
  } catch {
    if (raw.startsWith('/')) return escapeHtml(raw)
  }
  return '#'
}

export function renderMarkdown(text: string): string {
  // Escape HTML first to prevent XSS, then apply markdown substitutions
  const escaped = escapeHtml(text)
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, linkText, href) =>
      `<a href="${safeHref(href)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">${linkText}</a>`)
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)+/g, (m) => `<ul class="list-disc pl-4 space-y-0.5">${m}</ul>`)
    .replace(/\n/g, '<br />')
}
