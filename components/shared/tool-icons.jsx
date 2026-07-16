'use client'

// Monogram tiles for tools/platforms. Deliberately not reproductions of
// trademarked logo artwork — brand-accurate accent colour + letterform only,
// which keeps the grid legible, consistent, and legally clean.

const TOOL_STYLE = {
  excel:      { mark: 'X',  fg: '#1D6F42', bg: 'rgba(29,111,66,0.14)',   ring: 'rgba(29,111,66,0.4)' },
  powerpoint: { mark: 'P',  fg: '#C43E1C', bg: 'rgba(196,62,28,0.14)',   ring: 'rgba(196,62,28,0.4)' },
  word:       { mark: 'W',  fg: '#2B579A', bg: 'rgba(43,87,154,0.16)',   ring: 'rgba(43,87,154,0.45)' },
  powerbi:    { mark: 'BI', fg: '#E8B92E', bg: 'rgba(232,185,46,0.12)',  ring: 'rgba(232,185,46,0.35)' },
  sql:        { mark: 'SQL',fg: '#8FA6BF', bg: 'rgba(143,166,191,0.12)', ring: 'rgba(143,166,191,0.32)' },
  python:     { mark: 'Py', fg: '#4B8BBE', bg: 'rgba(75,139,190,0.14)',  ring: 'rgba(75,139,190,0.4)' },
  bloomberg:  { mark: 'B',  fg: '#F5F2EA', bg: 'rgba(245,242,234,0.07)', ring: 'rgba(245,242,234,0.22)' },
  vba:        { mark: 'VBA',fg: '#9C8CC4', bg: 'rgba(156,140,196,0.12)', ring: 'rgba(156,140,196,0.32)' },
  capitaliq:  { mark: 'IQ', fg: '#C8A76A', bg: 'rgba(200,167,106,0.12)', ring: 'rgba(200,167,106,0.35)' },
  pitchbook:  { mark: 'PB', fg: '#D96A4A', bg: 'rgba(217,106,74,0.12)',  ring: 'rgba(217,106,74,0.32)' },
  tableau:    { mark: 'T',  fg: '#E8762D', bg: 'rgba(232,118,45,0.12)',  ring: 'rgba(232,118,45,0.32)' },
  tracxn:     { mark: 'Tx', fg: '#5FA8D3', bg: 'rgba(95,168,211,0.12)',  ring: 'rgba(95,168,211,0.32)' },
  claude:     { mark: 'C',  fg: '#D97757', bg: 'rgba(217,119,87,0.12)',  ring: 'rgba(217,119,87,0.35)' },
  chatgpt:    { mark: 'AI', fg: '#10A37F', bg: 'rgba(16,163,127,0.12)',  ring: 'rgba(16,163,127,0.32)' },
  gemini:     { mark: 'G',  fg: '#8AB4F8', bg: 'rgba(138,180,248,0.12)', ring: 'rgba(138,180,248,0.32)' },
  notion:     { mark: 'N',  fg: '#F5F2EA', bg: 'rgba(245,242,234,0.06)', ring: 'rgba(245,242,234,0.2)' },
  github:     { mark: 'GH', fg: '#C9D1D9', bg: 'rgba(201,209,217,0.09)', ring: 'rgba(201,209,217,0.25)' },
  nextjs:     { mark: 'N',  fg: '#F5F2EA', bg: 'rgba(245,242,234,0.06)', ring: 'rgba(245,242,234,0.2)' },
  supabase:   { mark: 'S',  fg: '#3ECF8E', bg: 'rgba(62,207,142,0.12)',  ring: 'rgba(62,207,142,0.32)' },
  default:    { mark: '·',  fg: '#8B9098', bg: 'rgba(139,144,152,0.09)', ring: 'rgba(139,144,152,0.25)' },
}

export function ToolIcon({ toolKey, size = 34, logoUrl, label }) {
  // If an official brand asset has been supplied (admin → Skills → tool logo URL),
  // render it. Otherwise fall back to a clean monogram tile: we deliberately do
  // not hand-reproduce trademarked logo artwork.
  if (logoUrl) {
    return (
      <span
        style={{ width: size, height: size }}
        className="rounded-md flex items-center justify-center shrink-0 bg-white/[0.04] border border-white/[0.08] overflow-hidden"
      >
        <img src={logoUrl} alt={label || ''} className="w-[76%] h-[76%] object-contain" loading="lazy" />
      </span>
    )
  }
  const s = TOOL_STYLE[toolKey] || TOOL_STYLE.default
  const fontSize = s.mark.length > 2 ? size * 0.3 : s.mark.length === 2 ? size * 0.38 : size * 0.46
  return (
    <span
      aria-hidden="true"
      style={{
        width: size, height: size,
        background: s.bg,
        border: `1px solid ${s.ring}`,
        color: s.fg,
        fontSize,
      }}
      className="rounded-md flex items-center justify-center font-semibold tracking-tight shrink-0 select-none"
    >
      {s.mark}
    </span>
  )
}

export const hasToolStyle = (k) => Boolean(TOOL_STYLE[k])
