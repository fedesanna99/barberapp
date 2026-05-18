// Minimal HTML sanitizer for admin-authored notifications (task 9).
// We avoid pulling DOMPurify in just for one feature; the sanitizer is strict
// allow-list: parse the input into a detached document, then walk the tree
// keeping only safe tags/attributes. Everything else (scripts, iframes, on*
// handlers, javascript: URLs, style attributes, data: URLs) is stripped.

const ALLOWED_TAGS = new Set([
  'A', 'B', 'BR', 'EM', 'I', 'P', 'SPAN', 'STRONG', 'U',
  'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'CODE',
  'DIV', 'HR',
])

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(['href', 'title', 'target', 'rel']),
}

function isSafeUrl(url: string): boolean {
  const u = url.trim().toLowerCase()
  return u.startsWith('http://') || u.startsWith('https://') || u.startsWith('mailto:') || u.startsWith('#') || u.startsWith('/')
}

export function sanitizeNotificationHtml(input: string | null | undefined): string {
  if (!input) return ''
  const doc = new DOMParser().parseFromString(`<div>${input}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''
  walk(root)
  return root.innerHTML
}

function walk(node: Element): void {
  // Iterate over a static snapshot of children because we'll mutate as we go.
  for (const child of Array.from(node.children)) {
    if (!ALLOWED_TAGS.has(child.tagName)) {
      // Replace the disallowed element with its text content so we don't
      // silently swallow user-readable text alongside the strip.
      child.replaceWith(document.createTextNode(child.textContent ?? ''))
      continue
    }
    // Strip every attribute that isn't in the per-tag allow-list; for the few
    // allowed attributes, validate the value.
    const allowed = ALLOWED_ATTRS[child.tagName] ?? new Set<string>()
    for (const attr of Array.from(child.attributes)) {
      if (!allowed.has(attr.name)) {
        child.removeAttribute(attr.name)
        continue
      }
      if ((attr.name === 'href') && !isSafeUrl(attr.value)) {
        child.removeAttribute(attr.name)
        continue
      }
    }
    // Anchors get safe defaults so admin links don't expose users to tab-nabbing.
    if (child.tagName === 'A') {
      child.setAttribute('rel', 'noopener noreferrer')
      child.setAttribute('target', '_blank')
    }
    walk(child)
  }
}
