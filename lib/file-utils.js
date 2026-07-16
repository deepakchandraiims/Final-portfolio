// Client + server shared helpers for file rendering.
export const CATEGORY_META = {
  pdf:        { label: 'PDF',        emoji: '▤', accent: 'from-rose-500/30 to-red-500/20' },
  excel:      { label: 'Excel',      emoji: '∑', accent: 'from-emerald-500/30 to-green-500/20' },
  powerpoint: { label: 'PowerPoint', emoji: '◈', accent: 'from-orange-500/30 to-amber-500/20' },
  word:       { label: 'Word',       emoji: '¶', accent: 'from-sky-500/30 to-blue-500/20' },
  csv:        { label: 'CSV',        emoji: '▣', accent: 'from-teal-500/30 to-cyan-500/20' },
  markdown:   { label: 'Markdown',   emoji: '△', accent: 'from-neutral-500/30 to-slate-500/20' },
  zip:        { label: 'Archive',    emoji: '⚑', accent: 'from-yellow-500/30 to-amber-500/20' },
  python:     { label: 'Python',     emoji: 'π', accent: 'from-indigo-500/30 to-violet-500/20' },
  sql:        { label: 'SQL',        emoji: '∣',accent: 'from-fuchsia-500/30 to-pink-500/20' },
  image:      { label: 'Image',      emoji: '◉', accent: 'from-violet-500/30 to-purple-500/20' },
  video:      { label: 'Video',      emoji: '▶', accent: 'from-red-500/30 to-rose-500/20' },
  other:      { label: 'File',       emoji: '◇', accent: 'from-neutral-500/30 to-slate-500/20' },
}

export function formatBytes(n) {
  if (!n && n !== 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

// Return the best preview strategy for a file.
export function previewUrl(file) {
  if (!file) return null
  const { category, publicUrl } = file
  if (!publicUrl) return null
  if (category === 'pdf' || category === 'image' || category === 'video') return publicUrl
  // Office docs via Microsoft's public Office Online viewer
  if (['word', 'excel', 'powerpoint'].includes(category)) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicUrl)}`
  }
  // csv / md / py / sql / txt render as raw text in an iframe
  return publicUrl
}
