import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
export const BUCKET = process.env.SUPABASE_BUCKET || 'portfolio-files'

let _client = null
export function getSupabase() {
  if (_client) return _client
  if (!url || !key) throw new Error('Supabase env not configured')
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _client
}

// Ensure the bucket exists (idempotent). Safe to call once per cold start.
let _bucketChecked = false
export async function ensureBucket() {
  if (_bucketChecked) return
  const supabase = getSupabase()
  try {
    const { data: buckets } = await supabase.storage.listBuckets()
    const exists = buckets?.some((b) => b.name === BUCKET)
    if (!exists) {
      await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 52428800, // 50 MB
      })
    }
    _bucketChecked = true
  } catch (e) {
    console.error('ensureBucket error:', e?.message)
  }
}

export function categoryFromMime(mime = '', name = '') {
  const m = (mime || '').toLowerCase()
  const n = (name || '').toLowerCase()
  if (m.startsWith('image/')) return 'image'
  if (m.startsWith('video/')) return 'video'
  if (m === 'application/pdf' || n.endsWith('.pdf')) return 'pdf'
  if (n.endsWith('.xlsx') || n.endsWith('.xls') || m.includes('spreadsheet')) return 'excel'
  if (n.endsWith('.pptx') || n.endsWith('.ppt') || m.includes('presentation')) return 'powerpoint'
  if (n.endsWith('.docx') || n.endsWith('.doc') || m.includes('word')) return 'word'
  if (n.endsWith('.csv') || m === 'text/csv') return 'csv'
  if (n.endsWith('.md') || m === 'text/markdown') return 'markdown'
  if (n.endsWith('.zip') || m.includes('zip')) return 'zip'
  if (n.endsWith('.py')) return 'python'
  if (n.endsWith('.sql')) return 'sql'
  return 'other'
}

export function slugifyName(name) {
  return (name || 'file')
    .replace(/[^a-zA-Z0-9.\-_]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120)
}
