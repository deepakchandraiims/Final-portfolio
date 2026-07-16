// Supabase Postgres data layer (replaces MongoDB).
import { getSupabase } from '@/lib/supabase'
import { SEED_CONTENT } from '@/lib/portfolio-data'

// ---- site content (single row id='main') ----
export async function getContent() {
  const sb = getSupabase()
  const { data, error } = await sb.from('site_content').select('content').eq('id', 'main').maybeSingle()
  if (error) throw error
  if (!data) {
    await sb.from('site_content').upsert({ id: 'main', content: SEED_CONTENT, updated_at: new Date().toISOString() })
    return SEED_CONTENT
  }
  return data.content
}

export async function putContent(content) {
  const sb = getSupabase()
  const updated_at = new Date().toISOString()
  const { error } = await sb.from('site_content').upsert({ id: 'main', content, updated_at })
  if (error) throw error
  return updated_at
}

export async function resetContent() {
  const sb = getSupabase()
  const { error } = await sb.from('site_content').upsert({ id: 'main', content: SEED_CONTENT, updated_at: new Date().toISOString() })
  if (error) throw error
  return SEED_CONTENT
}

// ---- contact ----
export async function insertContact(record) {
  const sb = getSupabase()
  const row = {
    id: record.id,
    name: record.name,
    email: record.email,
    company: record.company,
    role: record.role,
    message: record.message,
    recruiter_mode: record.recruiterMode,
    created_at: new Date().toISOString(),
  }
  const { error } = await sb.from('contact_requests').insert(row)
  if (error) throw error
  return record
}

export async function listContacts() {
  const sb = getSupabase()
  const { data, error } = await sb.from('contact_requests').select('*').order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  return data || []
}

// ---- files ----
export async function insertFile(record) {
  const sb = getSupabase()
  const row = {
    id: record.id,
    original_name: record.originalName,
    label: record.label,
    mime_type: record.mimeType,
    size: record.size,
    category: record.category,
    storage_key: record.storageKey || null,
    public_url: record.publicUrl,
    project_id: record.projectId,
    project_title: record.projectTitle,
    source: record.source || 'upload',
    created_at: new Date().toISOString(),
  }
  const { error } = await sb.from('files').insert(row)
  if (error) throw error
  return record
}

function fileOut(r) {
  return {
    id: r.id, originalName: r.original_name, label: r.label, mimeType: r.mime_type,
    size: r.size, category: r.category, storageKey: r.storage_key, publicUrl: r.public_url,
    projectId: r.project_id, projectTitle: r.project_title, source: r.source || 'upload',
    createdAt: r.created_at,
  }
}

export async function listFiles(projectId) {
  const sb = getSupabase()
  let q = sb.from('files').select('*').order('created_at', { ascending: false }).limit(500)
  if (projectId) q = q.eq('project_id', projectId)
  const { data, error } = await q
  if (error) throw error
  return (data || []).map(fileOut)
}

export async function getFile(id) {
  const sb = getSupabase()
  const { data, error } = await sb.from('files').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? { raw: data, out: fileOut(data) } : null
}

export async function deleteFile(id) {
  const sb = getSupabase()
  const { error } = await sb.from('files').delete().eq('id', id)
  if (error) throw error
}

export async function updateFile(id, patch) {
  const sb = getSupabase()
  const update = {}
  if (patch.projectId !== undefined) update.project_id = patch.projectId || null
  if (patch.projectTitle !== undefined) update.project_title = patch.projectTitle || null
  if (patch.label !== undefined) update.label = patch.label
  const { data, error } = await sb.from('files').update(update).eq('id', id).select('*').maybeSingle()
  if (error) throw error
  return data ? fileOut(data) : null
}

// ---- analytics ----
export async function insertAnalyticsEvent(e) {
  const sb = getSupabase()
  const row = {
    session_id: e.sessionId,
    path: e.path || '/',
    referrer: e.referrer || null,
    device: e.device || 'desktop',
    browser: e.browser || 'unknown',
    recruiter_mode: !!e.recruiterMode,
    created_at: new Date().toISOString(),
  }
  const { error } = await sb.from('analytics_events').insert(row)
  if (error) throw error
}

export async function getAnalyticsSummary({ days = 14 } = {}) {
  const sb = getSupabase()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await sb
    .from('analytics_events')
    .select('session_id, path, referrer, device, browser, recruiter_mode, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(10000)
  if (error) throw error
  const rows = data || []

  const uniqueSessions = new Set(rows.map((r) => r.session_id))
  const dayKey = (iso) => iso.slice(0, 10)
  const dailyMap = new Map()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    dailyMap.set(d.toISOString().slice(0, 10), { views: 0, sessions: new Set() })
  }
  const pathCounts = new Map()
  const refCounts = new Map()
  const deviceCounts = new Map()
  let recruiterToggles = 0

  for (const r of rows) {
    const k = dayKey(r.created_at)
    if (dailyMap.has(k)) {
      const bucket = dailyMap.get(k)
      bucket.views += 1
      bucket.sessions.add(r.session_id)
    }
    pathCounts.set(r.path, (pathCounts.get(r.path) || 0) + 1)
    const ref = r.referrer && r.referrer.trim() ? r.referrer : 'Direct'
    refCounts.set(ref, (refCounts.get(ref) || 0) + 1)
    deviceCounts.set(r.device || 'desktop', (deviceCounts.get(r.device || 'desktop') || 0) + 1)
    if (r.recruiter_mode) recruiterToggles += 1
  }

  const dailySeries = Array.from(dailyMap.entries()).map(([date, v]) => ({
    date, views: v.views, sessions: v.sessions.size,
  }))
  const topN = (map, n = 6) => Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, count]) => ({ label, count }))

  return {
    rangeDays: days,
    totalViews: rows.length,
    uniqueSessions: uniqueSessions.size,
    recruiterModeViews: recruiterToggles,
    dailySeries,
    topPaths: topN(pathCounts),
    topReferrers: topN(refCounts),
    deviceBreakdown: topN(deviceCounts, 6),
  }
}
