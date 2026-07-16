'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, X, Trash2, File as FileIcon, Loader2, Check, Plus, GripVertical,
  Download, ExternalLink, Search, FolderOpen, Sparkles, ArrowLeft, LogOut,
  ChevronDown, ChevronRight, Save, RotateCcw, Eye, EyeOff, Star, Image as ImageIcon,
  User, Briefcase, Award, BarChart3, LineChart, Layers, Settings, ShieldAlert,
  Database, Globe, Activity, RefreshCw, Users, Smartphone, Monitor, Tablet,
  Link2, ShieldCheck, AlertTriangle, Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SEED_CONTENT, ACCENT_OPTIONS, CATEGORY_OPTIONS } from '@/lib/portfolio-data'
import { CATEGORY_META, formatBytes, previewUrl } from '@/lib/file-utils'

/* ========================== AUTH ========================== */
// The admin session lives entirely in an httpOnly cookie set by the server.
// No token or password is ever stored in localStorage / sessionStorage /
// the JS runtime — client code only ever asks "am I authenticated?".

async function adminFetch(url, opts = {}) {
  const res = await fetch(url, { ...opts, credentials: 'same-origin' })
  if (res.status === 401) window.dispatchEvent(new Event('admin:unauthorized'))
  return res
}

function useAdminSession() {
  const [status, setStatus] = useState('checking') // 'checking' | 'authed' | 'anon'
  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/session', { credentials: 'same-origin' })
      const d = await res.json()
      setStatus(d.authenticated ? 'authed' : 'anon')
    } catch { setStatus('anon') }
  }, [])
  useEffect(() => { check() }, [check])
  useEffect(() => {
    const onExpired = () => setStatus('anon')
    window.addEventListener('admin:unauthorized', onExpired)
    return () => window.removeEventListener('admin:unauthorized', onExpired)
  }, [])
  const logout = useCallback(async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {})
    setStatus('anon')
  }, [])
  return { status, refresh: check, logout }
}

function LoginGate({ onAuthed }) {
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setErr(null)
    try {
      const res = await fetch('/api/admin/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
      const data = await res.json()
      if (res.ok && data.ok) onAuthed()
      else setErr(data.error || 'Login failed')
    } catch { setErr('Network error') } finally { setLoading(false) }
  }
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 noise-bg" />
      <div className="absolute inset-0 grid-bg opacity-40" />
      <form onSubmit={submit} className="relative z-10 w-full max-w-sm p-8 rounded-2xl glass shine-border">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-gold-soft to-gold flex items-center justify-center shadow-lg shadow-gold/30">
          <Settings className="h-5 w-5 text-neutral-900" />
        </div>
        <h1 className="mt-6 font-serif text-3xl tracking-tight">Admin sign in</h1>
        <p className="mt-2 text-[13px] text-neutral-400">Enter the password to manage site content and files.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          autoComplete="current-password"
          className="mt-6 w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold/40"
        />
        {err && <div className="mt-3 text-[12px] text-red-400">{err}</div>}
        <Button type="submit" disabled={loading} className="mt-5 w-full bg-gold text-neutral-900 hover:bg-gold-soft h-10">
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
        <div className="mt-4 text-[11px] text-neutral-500">
          Default password: <span className="font-mono">admin</span> — set <span className="font-mono">ADMIN_PASSWORD</span> in your deploy environment to change it.
          Your session is a signed, httpOnly cookie — the password itself is never stored in the browser.
        </div>
      </form>
    </div>
  )
}

/* ==================== SHARED FORM ATOMS ==================== */

const Label = ({ children }) => (<div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5">{children}</div>)

const Field = ({ label, hint, children }) => (
  <div>
    {label && <Label>{label}</Label>}
    {children}
    {hint && <div className="mt-1 text-[11px] text-neutral-500">{hint}</div>}
  </div>
)

const TextInput = ({ value = '', onChange, placeholder, className = '', ...rest }) => (
  <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} {...rest}
    className={`w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-gold/40 ${className}`} />
)

const TextArea = ({ value = '', onChange, placeholder, rows = 4 }) => (
  <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-gold/40 resize-y" />
)

const SelectInput = ({ value, onChange, options = [], placeholder }) => (
  <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/40">
    {placeholder && <option value="" className="bg-neutral-950">{placeholder}</option>}
    {options.map((o) => <option key={o.value ?? o} value={o.value ?? o} className="bg-neutral-950">{o.label ?? o}</option>)}
  </select>
)

// ArrayOfStrings — comma/enter separated, chip UI
const StringListField = ({ items = [], onChange, placeholder = 'Add item…' }) => {
  const [draft, setDraft] = useState('')
  const add = (v) => { const t = (v ?? draft).trim(); if (!t) return; onChange([...(items || []), t]); setDraft('') }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10">
            {it}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-neutral-500 hover:text-red-400"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <TextInput value={draft} onChange={setDraft} placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
        <button type="button" onClick={() => add()} className="text-[12px] px-3 py-2 rounded-lg bg-gold/15 text-gold-soft border border-gold/30 hover:bg-gold/25 transition">Add</button>
      </div>
    </div>
  )
}

// Object-list field with a per-row renderer
const ObjectListField = ({ items = [], onChange, newItem, render, addLabel = 'Add', minimalOnEmpty }) => {
  const add = () => onChange([...(items || []), (typeof newItem === 'function' ? newItem() : { ...newItem })])
  const remove = (i) => onChange((items || []).filter((_, j) => j !== i))
  const update = (i, patch) => onChange((items || []).map((it, j) => (j === i ? { ...it, ...patch } : it)))
  const move = (i, dir) => {
    const arr = [...(items || [])]
    const j = i + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    onChange(arr)
  }
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="p-3 rounded-lg border border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-start gap-3">
            <div className="flex flex-col gap-1 pt-1 text-neutral-500">
              <button type="button" onClick={() => move(i, -1)} className="hover:text-white" title="Move up">↑</button>
              <button type="button" onClick={() => move(i, +1)} className="hover:text-white" title="Move down">↓</button>
            </div>
            <div className="flex-1">{render(it, (patch) => update(i, patch), i)}</div>
            <button type="button" onClick={() => remove(i)} className="text-neutral-500 hover:text-red-400" title="Remove"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
      {(!items || items.length === 0) && !minimalOnEmpty && <div className="text-[12px] text-neutral-500 italic">None yet.</div>}
      <button type="button" onClick={add} className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition">
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </button>
    </div>
  )
}

/* ==================== FILE MANAGER (existing, preserved) ==================== */

const ALL_PROJECTS_STATIC = (projects) => [{ id: '', title: '— Unassigned —' }, ...(projects || []).map((p) => ({ id: p.id, title: p.title }))]

function useFiles() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    setLoading(true)
    try { const r = await fetch('/api/files'); const data = await r.json(); setFiles(Array.isArray(data) ? data : []) }
    catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])
  useEffect(() => { refresh() }, [refresh])
  return { files, setFiles, loading, refresh }
}

function UploadDropzone({ projects, onUploaded }) {
  const [dragOver, setDragOver] = useState(false)
  const [queue, setQueue] = useState([])
  const [projectId, setProjectId] = useState('')
  const inputRef = useRef(null)
  const projectTitle = useMemo(() => (projects || []).find((p) => p.id === projectId)?.title || null, [projectId, projects])
  const uploadOne = useCallback((item) => new Promise((resolve) => {
    const form = new FormData()
    form.append('file', item.file)
    if (projectId) { form.append('projectId', projectId); if (projectTitle) form.append('projectTitle', projectTitle) }
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/files/upload')
    xhr.withCredentials = true
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) { const pct = Math.round((e.loaded / e.total) * 100); setQueue((q) => q.map((x) => (x.id === item.id ? { ...x, progress: pct } : x))) }
    }
    xhr.onload = () => {
      if (xhr.status === 401) window.dispatchEvent(new Event('admin:unauthorized'))
      if (xhr.status >= 200 && xhr.status < 300) {
        try { const res = JSON.parse(xhr.responseText); setQueue((q) => q.map((x) => (x.id === item.id ? { ...x, status: 'done', progress: 100 } : x))); onUploaded?.(res.file) }
        catch { setQueue((q) => q.map((x) => (x.id === item.id ? { ...x, status: 'error', error: 'bad response' } : x))) }
      } else { let msg = `HTTP ${xhr.status}`; try { msg = JSON.parse(xhr.responseText).error || msg } catch {}; setQueue((q) => q.map((x) => (x.id === item.id ? { ...x, status: 'error', error: msg } : x))) }
      resolve()
    }
    xhr.onerror = () => { setQueue((q) => q.map((x) => (x.id === item.id ? { ...x, status: 'error', error: 'network error' } : x))); resolve() }
    xhr.send(form)
  }), [projectId, projectTitle, onUploaded])
  const addFiles = useCallback((files) => {
    const list = Array.from(files || []); if (list.length === 0) return
    const items = list.map((f) => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, file: f, progress: 0, status: 'uploading' }))
    setQueue((q) => [...items, ...q])
    ;(async () => { for (const it of items) await uploadOne(it) })()
  }, [uploadOne])
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer?.files) }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Label>Attach to project</Label>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
          className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/40 min-w-[260px]">
          {ALL_PROJECTS_STATIC(projects).map((p) => (<option key={p.id} value={p.id} className="bg-neutral-950">{p.title}</option>))}
        </select>
      </div>
      <div onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} onClick={() => inputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed cursor-pointer p-10 text-center transition-all ${dragOver ? 'border-gold bg-gold/[0.05]' : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'}`}>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.csv,.md,.zip,.py,.sql,.txt,image/*,video/*" />
        <div className="mx-auto h-12 w-12 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center"><Upload className="h-5 w-5 text-gold-soft" /></div>
        <div className="mt-4 font-serif text-2xl tracking-tight">Drop files or click to upload</div>
        <div className="mt-1 text-[13px] text-neutral-400">PDF, Excel, PowerPoint, Word, CSV, Markdown, ZIP, Python, SQL, images, videos · up to 50 MB each</div>
      </div>
      <AnimatePresence>
        {queue.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            {queue.map((it) => (
              <div key={it.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/10 flex items-center gap-3">
                <FileIcon className="h-4 w-4 text-neutral-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13px] truncate">{it.file.name}</div>
                    <div className="text-[11px] text-neutral-500 shrink-0">{formatBytes(it.file.size)}</div>
                  </div>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-white/5 overflow-hidden">
                    <div className={`h-full transition-all ${it.status === 'error' ? 'bg-red-500' : it.status === 'done' ? 'bg-emerald-400' : 'bg-gold'}`} style={{ width: `${it.progress}%` }} />
                  </div>
                  {it.status === 'error' && <div className="mt-1 text-[11px] text-red-400">{it.error}</div>}
                </div>
                <div className="shrink-0">
                  {it.status === 'uploading' && <Loader2 className="h-4 w-4 text-gold animate-spin" />}
                  {it.status === 'done' && <Check className="h-4 w-4 text-emerald-400" />}
                  {it.status === 'error' && <X className="h-4 w-4 text-red-400" />}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DriveAttachButton({ projects, onAttached }) {
  const [busy, setBusy] = useState(false)
  const [configured, setConfigured] = useState(true)
  useEffect(() => { import('@/lib/google-drive-client').then((m) => setConfigured(m.isGoogleDriveConfigured())) }, [])
  const [projectId, setProjectId] = useState('')
  const projectTitle = useMemo(() => (projects || []).find((p) => p.id === projectId)?.title || null, [projectId, projects])

  const handle = async () => {
    setBusy(true)
    try {
      const { requestDriveAccessToken, openDrivePicker } = await import('@/lib/google-drive-client')
      const token = await requestDriveAccessToken()
      const picked = await openDrivePicker(token)
      if (!picked) return
      const res = await adminFetch('/api/files/attach-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...picked, url: picked.url, name: picked.name, projectId: projectId || null, projectTitle }),
      })
      if (res.ok) { const d = await res.json(); onAttached?.(d.file) }
      else { const d = await res.json().catch(() => ({})); alert(d.error || 'Could not attach file') }
    } catch (e) {
      alert(e?.message || 'Google Drive is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_API_KEY.')
    } finally { setBusy(false) }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap p-4 rounded-xl border border-dashed border-white/10 bg-white/[0.015]">
      <div className="h-9 w-9 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
        <svg viewBox="0 0 87.3 78" className="h-4 w-4"><path fill="#0066da" d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"/><path fill="#00ac47" d="M43.65 25l-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z"/><path fill="#ea4335" d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"/><path fill="#00832d" d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0h-18.5c-1.6 0-3.15.45-4.5 1.2z"/><path fill="#2684fc" d="M59.7 53h-27.5l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h45.9c1.6 0 3.15-.45 4.5-1.2z"/><path fill="#ffba00" d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 13.75 23.8h27.45c0-1.55-.4-3.1-1.2-4.5z"/></svg>
      </div>
      <div className="flex-1 min-w-[200px]">
        <div className="text-[13px] text-neutral-200">Attach a file from Google Drive</div>
        <div className="text-[11px] text-neutral-500 mt-0.5">Links the file by reference — nothing is copied through this server.</div>
      </div>
      <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
        className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-gold/40 min-w-[200px]">
        {ALL_PROJECTS_STATIC(projects).map((p) => (<option key={p.id} value={p.id} className="bg-neutral-950">{p.title}</option>))}
      </select>
      <Button type="button" onClick={handle} disabled={busy || !configured} className="bg-white/10 hover:bg-white/15 text-white h-9 rounded-full disabled:opacity-40">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
        {configured ? 'Connect & pick file' : 'Not configured'}
      </Button>
    </div>
  )
}

function FilePreviewDialog({ file, open, onClose }) {
  const [text, setText] = useState(null)
  const isRawText = file && ['csv', 'markdown', 'python', 'sql', 'other'].includes(file.category) && file.size < 200 * 1024
  useEffect(() => {
    setText(null); if (!open || !isRawText || !file) return
    fetch(file.publicUrl).then((r) => r.text()).then(setText).catch(() => setText('(preview unavailable)'))
  }, [open, isRawText, file])
  if (!file) return null
  const url = previewUrl(file)
  const meta = CATEGORY_META[file.category] || CATEGORY_META.other
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl bg-neutral-950 border-white/10 p-0 max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${meta.accent} flex items-center justify-center`}><span className="font-serif text-xl text-white/70">{meta.emoji}</span></div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="font-serif text-xl tracking-tight truncate">{file.label || file.originalName}</DialogTitle>
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 mt-0.5">{meta.label} · {formatBytes(file.size)}</div>
            </div>
            <a href={file.publicUrl} download target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition"><Download className="h-3.5 w-3.5" /> Download</a>
            <a href={file.publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition"><ExternalLink className="h-3.5 w-3.5" /> Open</a>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 bg-black/60">
          {file.category === 'image' && (<img src={file.publicUrl} alt={file.label} className="max-h-[75vh] mx-auto" />)}
          {file.category === 'video' && (<video src={file.publicUrl} controls className="w-full max-h-[75vh]" />)}
          {(file.category === 'pdf' || ['word', 'excel', 'powerpoint'].includes(file.category)) && (<iframe src={url} className="w-full h-[75vh]" title={file.label} />)}
          {isRawText && (<pre className="p-6 text-[12.5px] text-neutral-300 leading-relaxed overflow-auto max-h-[75vh] whitespace-pre-wrap font-mono bg-black/40">{text ?? 'Loading…'}</pre>)}
          {!['image', 'video', 'pdf', 'word', 'excel', 'powerpoint'].includes(file.category) && !isRawText && (
            <div className="p-10 text-center text-neutral-400 text-sm">No in-browser preview available. <a href={file.publicUrl} target="_blank" rel="noreferrer" className="text-gold-soft underline">Open the file</a>.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FileCard({ f, projects, onDelete, onOpen, onReassign }) {
  const meta = CATEGORY_META[f.category] || CATEGORY_META.other
  const isDrive = f.source === 'google-drive'
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const handleDelete = async () => {
    if (!confirm(`${isDrive ? 'Remove link to' : 'Delete'} "${f.label || f.originalName}"?`)) return
    setBusy(true)
    try { const res = await adminFetch(`/api/files/${f.id}`, { method: 'DELETE' }); if (res.ok) onDelete(f.id) }
    finally { setBusy(false) }
  }
  return (
    <div className="group relative rounded-2xl overflow-hidden bg-neutral-950 border border-white/[0.06] hover:border-white/15 transition-all">
      <button onClick={() => onOpen(f)} className="block w-full text-left">
        <div className={`relative aspect-video overflow-hidden bg-gradient-to-br ${meta.accent}`}>
          {f.category === 'image' && !isDrive ? (<img src={f.publicUrl} alt={f.label} className="absolute inset-0 w-full h-full object-cover" />) : (<div className="absolute inset-0 flex items-center justify-center"><span className="font-serif text-[120px] text-white/[0.09] leading-none select-none">{meta.emoji}</span></div>)}
          <div className="absolute top-3 left-3 glass rounded-full px-2 py-0.5 text-[10px]">{meta.label}</div>
          {isDrive ? (
            <div className="absolute top-3 right-3 glass rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1"><FolderOpen className="h-2.5 w-2.5" /> Drive</div>
          ) : (
            <div className="absolute top-3 right-3 text-[10px] text-white/60 font-mono">{formatBytes(f.size)}</div>
          )}
        </div>
        <div className="p-4">
          <div className="text-[13.5px] truncate font-medium">{f.label || f.originalName}</div>
          <div className="mt-1 text-[11px] text-neutral-500 truncate">{f.projectTitle || 'Unassigned'}</div>
        </div>
      </button>
      <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        <button onClick={() => setEditing(true)} className="h-7 w-7 rounded-full bg-black/70 hover:bg-white/20 border border-white/10 flex items-center justify-center" title="Reassign"><FolderOpen className="h-3.5 w-3.5" /></button>
        <a href={f.publicUrl} target="_blank" rel="noreferrer" className="h-7 w-7 rounded-full bg-black/70 hover:bg-white/20 border border-white/10 flex items-center justify-center" title="Open"><ExternalLink className="h-3.5 w-3.5" /></a>
        <button disabled={busy} onClick={handleDelete} className="h-7 w-7 rounded-full bg-black/70 hover:bg-red-500 border border-white/10 flex items-center justify-center" title="Delete">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</button>
      </div>
      {editing && (
        <Dialog open={editing} onOpenChange={(v) => !v && setEditing(false)}>
          <DialogContent className="max-w-md bg-neutral-950 border-white/10">
            <DialogHeader><DialogTitle className="font-serif text-xl">Reassign file</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <Field label="Label"><TextInput defaultValue={f.label || f.originalName} id="lbl" onChange={() => {}} /></Field>
              <Field label="Project">
                <select defaultValue={f.projectId || ''} id="pid" className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/40">
                  {ALL_PROJECTS_STATIC(projects).map((p) => (<option key={p.id} value={p.id} className="bg-neutral-950">{p.title}</option>))}
                </select>
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(false)} className="bg-transparent border-white/10">Cancel</Button>
                <Button onClick={async () => {
                  const lbl = document.getElementById('lbl').value
                  const pid = document.getElementById('pid').value
                  const pt = (projects || []).find((p) => p.id === pid)?.title || null
                  const r = await adminFetch(`/api/files/${f.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: lbl, projectId: pid || null, projectTitle: pt }) })
                  if (r.ok) { onReassign(f.id, { label: lbl, projectId: pid || null, projectTitle: pt }); setEditing(false) }
                }} className="bg-gold text-neutral-900 hover:bg-gold-soft">Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function FilesTab({ projects }) {
  const { files, setFiles, loading, refresh } = useFiles()
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('all')
  const [proj, setProj] = useState('all')
  const [preview, setPreview] = useState(null)
  const CATS = ['all', 'pdf', 'excel', 'powerpoint', 'word', 'image', 'video', 'csv', 'markdown', 'python', 'sql', 'zip', 'other']
  const filtered = useMemo(() => files.filter((f) => {
    if (cat !== 'all' && f.category !== cat) return false
    if (proj === 'unassigned' ? !!f.projectId : proj !== 'all' && f.projectId !== proj) return false
    if (search && !`${f.label} ${f.originalName} ${f.projectTitle || ''}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [files, cat, proj, search])
  return (
    <div>
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-5">
        <UploadDropzone projects={projects} onUploaded={(f) => setFiles((prev) => [f, ...prev])} />
        <DriveAttachButton projects={projects} onAttached={(f) => setFiles((prev) => [f, ...prev])} />
      </div>
      <div className="mt-8 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="h-4 w-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files…" className="w-full bg-white/[0.03] border border-white/10 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-gold/40" />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="bg-white/[0.03] border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none">
          {CATS.map((c) => (<option key={c} value={c} className="bg-neutral-950">{c === 'all' ? 'All types' : (CATEGORY_META[c]?.label || c)}</option>))}
        </select>
        <select value={proj} onChange={(e) => setProj(e.target.value)} className="bg-white/[0.03] border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none">
          <option value="all" className="bg-neutral-950">All projects</option>
          <option value="unassigned" className="bg-neutral-950">— Unassigned —</option>
          {(projects || []).map((p) => (<option key={p.id} value={p.id} className="bg-neutral-950">{p.title}</option>))}
        </select>
        <button onClick={refresh} className="text-[12px] text-neutral-400 hover:text-white transition px-3 py-2 rounded-full border border-white/10 hover:bg-white/5">Refresh</button>
        <div className="ml-auto text-[12px] text-neutral-500">{loading ? 'Loading…' : `${filtered.length} of ${files.length} files`}</div>
      </div>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map((f) => (
          <FileCard key={f.id} f={f} projects={projects} onDelete={(id) => setFiles((prev) => prev.filter((x) => x.id !== id))} onOpen={setPreview} onReassign={(id, patch) => setFiles((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))} />
        ))}
      </div>
      {!loading && filtered.length === 0 && (
        <div className="mt-10 p-16 rounded-2xl border border-dashed border-white/10 text-center text-neutral-400">
          <FolderOpen className="h-8 w-8 mx-auto text-neutral-500" />
          <div className="mt-3 font-serif text-xl">No files yet</div>
          <div className="text-[13px] mt-1">Drop your first PDF, deck or model above — or attach one from Google Drive.</div>
        </div>
      )}
      <FilePreviewDialog file={preview} open={!!preview} onClose={() => setPreview(null)} />
    </div>
  )
}

/* ==================== CONTENT EDITOR SECTIONS ==================== */

function OwnerEditor({ owner, onChange, imageFiles }) {
  const set = (k, v) => onChange({ ...owner, [k]: v })
  const intel = owner.intelligence || {}
  const setIntel = (k, v) => set('intelligence', { ...intel, [k]: v })
  const imageOptions = [{ label: '— None (use default) —', value: '' }, ...imageFiles.map((f) => ({ label: f.label || f.originalName, value: f.publicUrl }))]
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Name"><TextInput value={owner.name} onChange={(v) => set('name', v)} /></Field>
        <Field label="Role headline"><TextInput value={owner.role} onChange={(v) => set('role', v)} placeholder="Strategic Finance · Corporate Strategy · …" /></Field>
        <Field label="Current title (shown on portrait card)"><TextInput value={owner.currentRole || ''} onChange={(v) => set('currentRole', v)} placeholder="Associate · M&A + Strategic Finance" /></Field>
        <Field label="Location"><TextInput value={owner.location} onChange={(v) => set('location', v)} /></Field>
        <Field label="Email"><TextInput value={owner.email} onChange={(v) => set('email', v)} /></Field>
        <Field label="LinkedIn URL"><TextInput value={owner.linkedin} onChange={(v) => set('linkedin', v)} /></Field>
        <Field label="Resume URL" hint="Paste a public URL — or upload in the Files tab and paste the URL here."><TextInput value={owner.resumeUrl || ''} onChange={(v) => set('resumeUrl', v)} placeholder="https://…" /></Field>
        <Field label="Portrait image (from uploads)">
          <SelectInput value={owner.portraitUrl || ''} onChange={(v) => set('portraitUrl', v)} options={imageOptions} />
        </Field>
      </div>
      <Field label="Hero headline (capital-allocation positioning)"><TextArea value={owner.heroHeadline || ''} onChange={(v) => set('heroHeadline', v)} rows={2} placeholder="I help companies make better capital allocation decisions." /></Field>
      <Field label="Hero summary (max 3 lines)"><TextArea value={owner.heroSummary || ''} onChange={(v) => set('heroSummary', v)} rows={2} /></Field>
      <Field label="Hero tagline (fallback / meta)"><TextArea value={owner.tagline} onChange={(v) => set('tagline', v)} rows={2} /></Field>
      <Field label="Bio (appears in About section)"><TextArea value={owner.bio} onChange={(v) => set('bio', v)} rows={3} /></Field>
      <Field label="Availability (Recruiter-mode banner)"><TextArea value={owner.availability} onChange={(v) => set('availability', v)} rows={2} /></Field>

      <div className="pt-2 border-t border-white/[0.06]">
        <Label>Deepak Intelligence panel</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          <Field label="Current Position"><TextInput value={intel.currentPosition || ''} onChange={(v) => setIntel('currentPosition', v)} /></Field>
          <Field label="Current Company"><TextInput value={intel.currentCompany || ''} onChange={(v) => setIntel('currentCompany', v)} /></Field>
          <Field label="Latest Work"><TextInput value={intel.latestWork || ''} onChange={(v) => setIntel('latestWork', v)} /></Field>
          <Field label="Latest Model"><TextInput value={intel.latestModel || ''} onChange={(v) => setIntel('latestModel', v)} /></Field>
          <Field label="Latest Research"><TextInput value={intel.latestResearch || ''} onChange={(v) => setIntel('latestResearch', v)} /></Field>
          <Field label="Current Focus"><TextInput value={intel.currentFocus || ''} onChange={(v) => setIntel('currentFocus', v)} /></Field>
        </div>
        <div className="mt-3">
          <Label>Intelligence stats (Deal pipeline, Models built, …)</Label>
          <ObjectListField items={intel.stats || []} onChange={(v) => setIntel('stats', v)} newItem={{ k: '', v: '' }} addLabel="Add stat" render={(s, u) => (
            <div className="grid grid-cols-2 gap-2">
              <TextInput value={s.k} onChange={(val) => u({ k: val })} placeholder="Deal pipeline" />
              <TextInput value={s.v} onChange={(val) => u({ v: val })} placeholder="$4.8B+" />
            </div>
          )} />
        </div>
      </div>
      <div>
        <Label>Hero metrics (legacy — used in Recruiter snapshot)</Label>
        <ObjectListField items={owner.metrics || []} onChange={(v) => set('metrics', v)} newItem={{ value: '', label: '' }} addLabel="Add metric" render={(m, u) => (
          <div className="grid grid-cols-2 gap-2">
            <TextInput value={m.value} onChange={(v) => u({ value: v })} placeholder="$4.8B+" />
            <TextInput value={m.label} onChange={(v) => u({ label: v })} placeholder="Transactions supported" />
          </div>
        )} />
      </div>
    </div>
  )
}

function ChaptersEditor({ chapters, onChange }) {
  const [why, how] = chapters
  const setWhy = (patch) => onChange([{ ...why, ...patch }, how])
  const setHow = (patch) => onChange([why, { ...how, ...patch }])
  return (
    <div className="space-y-8">
      <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5">
        <div className="text-[11px] uppercase tracking-widest text-gold/80">Chapter I</div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Kicker"><TextInput value={why.kicker} onChange={(v) => setWhy({ kicker: v })} /></Field>
          <Field label="Title"><TextInput value={why.title} onChange={(v) => setWhy({ title: v })} /></Field>
        </div>
        <Field label="Body"><TextArea value={why.body} onChange={(v) => setWhy({ body: v })} rows={4} /></Field>
      </div>
      <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5">
        <div className="text-[11px] uppercase tracking-widest text-gold/80">Chapter II</div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Kicker"><TextInput value={how.kicker} onChange={(v) => setHow({ kicker: v })} /></Field>
          <Field label="Title"><TextInput value={how.title} onChange={(v) => setHow({ title: v })} /></Field>
        </div>
        <div className="mt-4">
          <Label>Principles (4 recommended)</Label>
          <ObjectListField items={how.principles || []} onChange={(v) => setHow({ principles: v })} newItem={{ t: '', d: '' }} addLabel="Add principle" render={(p, u) => (
            <div className="space-y-2">
              <TextInput value={p.t} onChange={(v) => u({ t: v })} placeholder="Assumptions are the product." />
              <TextArea value={p.d} onChange={(v) => u({ d: v })} placeholder="A model is only as valuable as…" rows={2} />
            </div>
          )} />
        </div>
      </div>
    </div>
  )
}

function ProjectRow({ p, expanded, onToggle, onChange, onDelete, imageFiles }) {
  const set = (k, v) => onChange({ ...p, [k]: v })
  const imageOptions = [{ label: '— None (use gradient + emoji) —', value: '' }, ...imageFiles.map((f) => ({ label: f.label || f.originalName, value: f.publicUrl }))]
  return (
    <div className={`rounded-xl border ${expanded ? 'border-gold/30 bg-gold/[0.02]' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15'} transition`}>
      <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${p.accent} flex items-center justify-center shrink-0 overflow-hidden`}>
          {p.coverImageUrl ? <img src={p.coverImageUrl} alt="" className="w-full h-full object-cover" /> : <span className="font-serif text-2xl text-white/70">{p.coverEmoji || '◇'}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500">{p.category}</div>
            {p.featured && <div className="text-[10px] text-gold-soft"><Star className="h-3 w-3 inline mr-1" />Featured</div>}
            {p.hidden && <div className="text-[10px] text-neutral-500"><EyeOff className="h-3 w-3 inline mr-1" />Hidden</div>}
          </div>
          <div className="mt-0.5 font-serif text-lg truncate">{p.title || <span className="italic text-neutral-500">(untitled)</span>}</div>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-neutral-500" /> : <ChevronRight className="h-4 w-4 text-neutral-500" />}
      </button>
      {expanded && (
        <div className="px-4 pb-5 border-t border-white/5">
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="ID / slug (immutable-ish)"><TextInput value={p.id} onChange={(v) => set('id', v)} placeholder="ma-tmt-2b" /></Field>
            <Field label="Title"><TextInput value={p.title} onChange={(v) => set('title', v)} /></Field>
            <Field label="Category"><SelectInput value={p.category} onChange={(v) => set('category', v)} options={CATEGORY_OPTIONS} /></Field>
            <Field label="Industry"><TextInput value={p.industry} onChange={(v) => set('industry', v)} /></Field>
            <Field label="Year"><TextInput type="number" value={p.year} onChange={(v) => set('year', Number(v) || p.year)} /></Field>
            <Field label="Reading minutes"><TextInput type="number" value={p.readingMinutes} onChange={(v) => set('readingMinutes', Number(v) || 0)} /></Field>
            <Field label="Impact (one-liner)"><TextInput value={p.impact} onChange={(v) => set('impact', v)} placeholder="$2.4B enterprise value; 3 confirmatory bids" /></Field>
            <Field label="Cover emoji / symbol"><TextInput value={p.coverEmoji || ''} onChange={(v) => set('coverEmoji', v)} placeholder="⌘ ∫ ◐ …" /></Field>
            <Field label="Accent gradient">
              <SelectInput value={p.accent} onChange={(v) => set('accent', v)} options={ACCENT_OPTIONS} />
            </Field>
            <Field label="Cover image (optional, overrides emoji)">
              <SelectInput value={p.coverImageUrl || ''} onChange={(v) => set('coverImageUrl', v)} options={imageOptions} />
            </Field>
          </div>
          <div className="mt-4 flex items-center gap-6">
            <label className="flex items-center gap-2 text-[13px]">
              <Switch checked={!!p.featured} onCheckedChange={(v) => set('featured', v)} className="data-[state=checked]:bg-gold" />
              <span>Featured (shows in Recruiter Mode)</span>
            </label>
            <label className="flex items-center gap-2 text-[13px]">
              <Switch checked={!!p.hidden} onCheckedChange={(v) => set('hidden', v)} className="data-[state=checked]:bg-neutral-500" />
              <span>Hidden (confidential — not shown publicly)</span>
            </label>
          </div>
          <div className="mt-5">
            <Field label="Executive summary (Recruiter summary block)"><TextArea value={p.executiveSummary} onChange={(v) => set('executiveSummary', v)} rows={4} /></Field>
          </div>
          <div className="mt-4">
            <Field label="Business problem"><TextArea value={p.problem} onChange={(v) => set('problem', v)} rows={3} /></Field>
          </div>
          <div className="mt-4">
            <Label>Metrics (3 recommended)</Label>
            <ObjectListField items={p.metrics || []} onChange={(v) => set('metrics', v)} newItem={{ k: '', v: '' }} addLabel="Add metric" render={(m, u) => (
              <div className="grid grid-cols-2 gap-2">
                <TextInput value={m.v} onChange={(v) => u({ v })} placeholder="$2.4B" />
                <TextInput value={m.k} onChange={(v) => u({ k: v })} placeholder="EV" />
              </div>
            )} />
          </div>
          <div className="mt-4">
            <Label>Approach (numbered steps)</Label>
            <ObjectListField items={(p.approach || []).map((s) => ({ s }))} onChange={(v) => set('approach', v.map((x) => x.s))} newItem={{ s: '' }} addLabel="Add step" render={(x, u) => (
              <TextArea value={x.s} onChange={(v) => u({ s: v })} rows={2} placeholder="Rebuilt the three-statement operating model bottoms-up from cohort ARR data." />
            )} />
          </div>
          <div className="mt-4">
            <Label>Deliverables</Label>
            <StringListField items={p.deliverables || []} onChange={(v) => set('deliverables', v)} placeholder="Operating model (Excel)" />
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tools</Label>
              <StringListField items={p.tools || []} onChange={(v) => set('tools', v)} placeholder="Excel" />
            </div>
            <div>
              <Label>Tags</Label>
              <StringListField items={p.tags || []} onChange={(v) => set('tags', v)} placeholder="M&A" />
            </div>
          </div>
          <div className="mt-4">
            <Field label="Key learning (pull quote)"><TextArea value={p.learnings} onChange={(v) => set('learnings', v)} rows={2} /></Field>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => { if (confirm(`Delete project "${p.title}"?`)) onDelete() }} className="text-[12px] text-red-400 hover:text-red-300 inline-flex items-center gap-1.5"><Trash2 className="h-3.5 w-3.5" /> Delete project</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ProjectsEditor({ projects, onChange, imageFiles }) {
  const [openId, setOpenId] = useState(null)
  const add = () => {
    const newP = {
      id: `new-${Date.now().toString(36)}`, title: 'New project', category: 'M&A', industry: 'Industry', year: new Date().getFullYear(),
      accent: ACCENT_OPTIONS[0], coverEmoji: '◇', tags: [], tools: [], impact: '', metrics: [],
      featured: false, hidden: false, executiveSummary: '', problem: '', approach: [], deliverables: [],
      learnings: '', readingMinutes: 5,
    }
    onChange([newP, ...projects])
    setOpenId(newP.id)
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[13px] text-neutral-400">{projects.length} project{projects.length === 1 ? '' : 's'}</div>
        <button onClick={add} className="inline-flex items-center gap-1.5 text-[13px] px-3 py-2 rounded-full bg-gold text-neutral-900 font-medium hover:bg-gold-soft transition"><Plus className="h-4 w-4" /> New project</button>
      </div>
      <div className="space-y-2">
        {projects.map((p) => (
          <ProjectRow key={p.id} p={p} expanded={openId === p.id} onToggle={() => setOpenId(openId === p.id ? null : p.id)} onChange={(np) => onChange(projects.map((x) => (x.id === p.id ? np : x)))} onDelete={() => onChange(projects.filter((x) => x.id !== p.id))} imageFiles={imageFiles} />
        ))}
      </div>
    </div>
  )
}

function SkillsEditor({ skills, onChange }) {
  return (
    <ObjectListField items={skills} onChange={onChange} newItem={{ group: 'New group', items: [] }} addLabel="Add group" render={(g, u) => (
      <div className="space-y-3">
        <Field label="Group name"><TextInput value={g.group} onChange={(v) => u({ group: v })} placeholder="Finance & Valuation" /></Field>
        <Field label="Skills"><StringListField items={g.items || []} onChange={(v) => u({ items: v })} placeholder="DCF" /></Field>
      </div>
    )} />
  )
}

function ExperienceEditor({ experience, onChange }) {
  return (
    <ObjectListField items={experience} onChange={onChange} newItem={{ company: 'New Company', role: '', period: '', location: '', bullets: [] }} addLabel="Add experience" render={(e, u) => (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Company"><TextInput value={e.company} onChange={(v) => u({ company: v })} /></Field>
          <Field label="Role"><TextInput value={e.role} onChange={(v) => u({ role: v })} /></Field>
          <Field label="Period"><TextInput value={e.period} onChange={(v) => u({ period: v })} placeholder="2023 — Present" /></Field>
          <Field label="Location"><TextInput value={e.location} onChange={(v) => u({ location: v })} /></Field>
        </div>
        <Field label="Bullets"><StringListField items={e.bullets || []} onChange={(v) => u({ bullets: v })} placeholder="Led modelling on 6 sell-side mandates…" /></Field>
      </div>
    )} />
  )
}

function CategoriesEditor({ categories, onChange }) {
  return (
    <Field label="Category chips (order shown on the site)">
      <StringListField items={categories || []} onChange={onChange} placeholder="M&A" />
    </Field>
  )
}

function PhilosophyEditor({ philosophy, onChange }) {
  return (
    <ObjectListField items={philosophy || []} onChange={onChange} newItem={{ id: `q-${Date.now().toString(36)}`, quote: '', author: '' }} addLabel="Add quote" render={(q, u) => (
      <div className="space-y-3">
        <Field label="Quote"><TextArea value={q.quote} onChange={(v) => u({ quote: v })} rows={3} placeholder="The first rule of compounding…" /></Field>
        <Field label="Author"><TextInput value={q.author} onChange={(v) => u({ author: v })} placeholder="Warren Buffett" /></Field>
      </div>
    )} />
  )
}

function EducationEditor({ education, onChange }) {
  return (
    <ObjectListField items={education || []} onChange={onChange} newItem={{ id: `edu-${Date.now().toString(36)}`, institution: '', degree: '', field: '', start: '', end: '', location: '', logoUrl: '', achievements: [], coursework: [], awards: [] }} addLabel="Add education" render={(e, u) => (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Institution"><TextInput value={e.institution} onChange={(v) => u({ institution: v })} /></Field>
          <Field label="Degree"><TextInput value={e.degree} onChange={(v) => u({ degree: v })} placeholder="MBA" /></Field>
          <Field label="Field / Major"><TextInput value={e.field} onChange={(v) => u({ field: v })} placeholder="Finance & Strategy" /></Field>
          <Field label="Location"><TextInput value={e.location} onChange={(v) => u({ location: v })} /></Field>
          <Field label="Start"><TextInput value={e.start} onChange={(v) => u({ start: v })} placeholder="2019" /></Field>
          <Field label="End"><TextInput value={e.end} onChange={(v) => u({ end: v })} placeholder="2021" /></Field>
        </div>
        <Field label="Logo URL (optional)"><TextInput value={e.logoUrl} onChange={(v) => u({ logoUrl: v })} placeholder="https://…" /></Field>
        <Field label="Achievements"><StringListField items={e.achievements || []} onChange={(v) => u({ achievements: v })} placeholder="Dean’s Merit List" /></Field>
        <Field label="Awards"><StringListField items={e.awards || []} onChange={(v) => u({ awards: v })} placeholder="Best Capstone" /></Field>
        <Field label="Relevant coursework"><StringListField items={e.coursework || []} onChange={(v) => u({ coursework: v })} placeholder="Valuation" /></Field>
      </div>
    )} />
  )
}

function CertificationsEditor({ certifications, onChange, imageFiles }) {
  const imageOptions = [{ label: '— None —', value: '' }, ...imageFiles.map((f) => ({ label: f.label || f.originalName, value: f.publicUrl }))]
  return (
    <ObjectListField items={certifications || []} onChange={onChange} newItem={{ id: `cert-${Date.now().toString(36)}`, name: '', provider: '', issued: '', credentialId: '', verifyUrl: '', imageUrl: '' }} addLabel="Add certification" render={(c, u) => (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Name"><TextInput value={c.name} onChange={(v) => u({ name: v })} placeholder="CFA — Level I" /></Field>
          <Field label="Provider"><TextInput value={c.provider} onChange={(v) => u({ provider: v })} placeholder="CFA Institute" /></Field>
          <Field label="Issued"><TextInput value={c.issued} onChange={(v) => u({ issued: v })} placeholder="2023" /></Field>
          <Field label="Credential ID"><TextInput value={c.credentialId} onChange={(v) => u({ credentialId: v })} /></Field>
        </div>
        <Field label="Verification URL"><TextInput value={c.verifyUrl} onChange={(v) => u({ verifyUrl: v })} placeholder="https://…" /></Field>
        <Field label="Badge / certificate image"><SelectInput value={c.imageUrl || ''} onChange={(v) => u({ imageUrl: v })} options={imageOptions} /></Field>
      </div>
    )} />
  )
}

function ResearchEditor({ research, onChange }) {
  return (
    <ObjectListField items={research || []} onChange={onChange} newItem={{ id: `res-${Date.now().toString(36)}`, title: '', type: 'Investment Thesis', date: '', summary: '', tags: [], link: '', fileUrl: '' }} addLabel="Add research" render={(r, u) => (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Title"><TextInput value={r.title} onChange={(v) => u({ title: v })} /></Field>
          <Field label="Type"><TextInput value={r.type} onChange={(v) => u({ type: v })} placeholder="DRHP Analysis" /></Field>
          <Field label="Date"><TextInput value={r.date} onChange={(v) => u({ date: v })} placeholder="2025" /></Field>
          <Field label="External link"><TextInput value={r.link} onChange={(v) => u({ link: v })} placeholder="https://…" /></Field>
        </div>
        <Field label="PDF / file URL (optional)"><TextInput value={r.fileUrl} onChange={(v) => u({ fileUrl: v })} placeholder="Upload in Files tab, paste URL" /></Field>
        <Field label="Summary"><TextArea value={r.summary} onChange={(v) => u({ summary: v })} rows={3} /></Field>
        <Field label="Tags"><StringListField items={r.tags || []} onChange={(v) => u({ tags: v })} placeholder="Valuation" /></Field>
      </div>
    )} />
  )
}

/* ==================== INVESTMENT LAB EDITORS ==================== */

function LabSettingsEditor({ lab, onChange }) {
  const st = lab?.settings || {}
  const set = (k, v) => onChange({ ...lab, settings: { ...st, [k]: v } })
  const setFx = (cur, v) => set('fxRates', { ...(st.fxRates || {}), [cur]: Number(v) || 0 })
  const currencies = ['INR', 'USD', 'EUR', 'GBP', 'SGD']
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Portfolio name"><TextInput value={st.portfolioName || ''} onChange={(v) => set('portfolioName', v)} placeholder="Hypothetical India Portfolio" /></Field>
        <Field label="Initial capital"><TextInput value={String(st.initialCapital ?? '')} onChange={(v) => set('initialCapital', Number(v) || 0)} placeholder="10000000" /></Field>
        <Field label="Start date"><TextInput value={st.startDate || ''} onChange={(v) => set('startDate', v)} placeholder="2023-04-01" /></Field>
        <Field label="Base currency">
          <SelectInput value={st.baseCurrency || 'INR'} onChange={(v) => set('baseCurrency', v)} options={currencies.map((c) => ({ label: c, value: c }))} />
        </Field>
        <Field label="Benchmark">
          <SelectInput value={st.benchmark || 'nifty50'} onChange={(v) => set('benchmark', v)} options={[
            { label: 'NIFTY 50', value: 'nifty50' }, { label: 'NIFTY 500', value: 'nifty500' },
            { label: 'SENSEX', value: 'sensex' }, { label: 'NASDAQ', value: 'nasdaq' },
            { label: 'S&P 500', value: 'sp500' }, { label: 'Custom', value: 'custom' },
          ]} />
        </Field>
        {st.benchmark === 'custom' && (
          <Field label="Custom benchmark symbol"><TextInput value={st.benchmarkCustomSymbol || ''} onChange={(v) => set('benchmarkCustomSymbol', v)} placeholder="^NSEI" /></Field>
        )}
        <Field label="Risk-free rate (decimal)"><TextInput value={String(st.riskFreeRate ?? '')} onChange={(v) => set('riskFreeRate', Number(v) || 0)} placeholder="0.07" /></Field>
        <Field label="Investment horizon"><TextInput value={st.horizon || ''} onChange={(v) => set('horizon', v)} placeholder="5–10 years" /></Field>
        <Field label="Risk profile"><TextInput value={st.riskProfile || ''} onChange={(v) => set('riskProfile', v)} placeholder="Moderate — concentrated, long-only" /></Field>
      </div>

      <div className="pt-3 border-t border-white/[0.06]">
        <Label>FX rates — units of base currency per 1 unit</Label>
        <p className="text-[11px] text-neutral-500 mt-1 mb-2">
          Required for any holding not in the base currency. A missing rate excludes that position from
          totals (and warns) rather than silently summing $ and ₹ at 1:1.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {currencies.map((c) => (
            <Field key={c} label={c}>
              <TextInput value={String(st.fxRates?.[c] ?? '')} onChange={(v) => setFx(c, v)} placeholder={c === st.baseCurrency ? '1' : '83.5'} />
            </Field>
          ))}
        </div>
      </div>

      <Field label="Portfolio description"><TextArea value={st.description || ''} onChange={(v) => set('description', v)} rows={3} /></Field>
      <Field label="Investment philosophy"><TextArea value={st.philosophy || ''} onChange={(v) => set('philosophy', v)} rows={4} /></Field>
      <Field label="Disclosure (shown above every Lab page)">
        <TextArea value={st.disclosure || ''} onChange={(v) => set('disclosure', v)} rows={3} />
      </Field>
    </div>
  )
}

function MemoEditor({ memo, onChange }) {
  const m = memo || {}
  const set = (k, v) => onChange({ ...m, [k]: v })
  const FIELDS = [
    ['thesis', 'Investment Thesis'], ['whyBought', 'Why I Bought It'], ['valuation', 'Valuation'],
    ['catalysts', 'Catalysts'], ['risks', 'Risks'], ['moat', 'Competitive Advantage'],
    ['management', 'Management Quality'], ['industryOutlook', 'Industry Outlook'],
    ['financialSnapshot', 'Financial Snapshot'], ['keyRatios', 'Key Ratios'],
    ['exitStrategy', 'Exit Strategy'], ['monitoringChecklist', 'Monitoring Checklist'],
    ['lessons', 'Lessons Learned'],
  ]
  return (
    <div className="space-y-2.5 mt-3 pt-3 border-t border-white/[0.06]">
      <Label>Investment memo</Label>
      {FIELDS.map(([k, label]) => (
        <Field key={k} label={label}>
          <TextArea value={m[k] || ''} onChange={(v) => set(k, v)} rows={2} />
        </Field>
      ))}
      <Field label="Attachments (label|url per line)">
        <TextArea
          value={(m.attachments || []).map((a) => `${a.label || ''}|${a.url || ''}`).join('\n')}
          onChange={(v) => set('attachments', v.split('\n').filter(Boolean).map((line) => {
            const [label, url] = line.split('|')
            return { label: (label || '').trim(), url: (url || '').trim() }
          }))}
          rows={2}
        />
      </Field>
    </div>
  )
}

function LabHoldingsEditor({ lab, onChange, imageFiles }) {
  const holdings = lab?.holdings || []
  const setHoldings = (v) => onChange({ ...lab, holdings: v })
  const imageOptions = [{ label: '— None —', value: '' }, ...imageFiles.map((f) => ({ label: f.label || f.originalName, value: f.publicUrl }))]
  const ASSET_CLASSES = ['Indian Stocks', 'US Stocks', 'ETFs', 'Mutual Funds', 'Index Funds', 'Gold ETF', 'REITs', 'INVITs', 'Bonds', 'Government Securities', 'Fixed Deposits', 'Cash', 'Crypto', 'Alternative Investments']
  const EXCHANGES = ['NSE', 'BSE', 'NYSE', 'NASDAQ', 'AMEX', 'LSE', 'SGX', 'N/A']
  const STATUS = ['Holding', 'Exited', 'Watchlist', 'Closed']
  const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'SGD']

  return (
    <ObjectListField
      items={holdings}
      onChange={setHoldings}
      addLabel="Add instrument"
      newItem={{
        id: `h-${Date.now().toString(36)}`, name: '', ticker: '', exchange: 'NSE', isin: '',
        sector: '', industry: '', country: 'India', assetClass: 'Indian Stocks',
        entryDate: '', entryPrice: 0, currentPrice: null, exitPrice: null, exitDate: '',
        quantity: 0, targetAllocation: 0, status: 'Holding', averageCost: 0,
        targetPrice: null, stopLoss: null, horizon: '', currency: 'INR',
        notes: '', tags: [], logoUrl: '', coverImageUrl: '', enabled: true, order: holdings.length + 1,
        memo: {},
      }}
      render={(h, u) => (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <Field label="Name"><TextInput value={h.name} onChange={(v) => u({ name: v })} placeholder="HDFC Bank" /></Field>
            <Field label="Ticker"><TextInput value={h.ticker} onChange={(v) => u({ ticker: v })} placeholder="HDFCBANK.NS" /></Field>
            <Field label="Exchange"><SelectInput value={h.exchange} onChange={(v) => u({ exchange: v })} options={EXCHANGES.map((x) => ({ label: x, value: x }))} /></Field>
            <Field label="ISIN"><TextInput value={h.isin} onChange={(v) => u({ isin: v })} /></Field>
            <Field label="Sector"><TextInput value={h.sector} onChange={(v) => u({ sector: v })} /></Field>
            <Field label="Industry"><TextInput value={h.industry} onChange={(v) => u({ industry: v })} /></Field>
            <Field label="Country"><TextInput value={h.country} onChange={(v) => u({ country: v })} /></Field>
            <Field label="Asset class"><SelectInput value={h.assetClass} onChange={(v) => u({ assetClass: v })} options={ASSET_CLASSES.map((x) => ({ label: x, value: x }))} /></Field>
            <Field label="Status"><SelectInput value={h.status} onChange={(v) => u({ status: v })} options={STATUS.map((x) => ({ label: x, value: x }))} /></Field>
            <Field label="Currency"><SelectInput value={h.currency} onChange={(v) => u({ currency: v })} options={CURRENCIES.map((x) => ({ label: x, value: x }))} /></Field>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <Field label="Entry date"><TextInput value={h.entryDate} onChange={(v) => u({ entryDate: v })} placeholder="2023-04-12" /></Field>
            <Field label="Quantity"><TextInput value={String(h.quantity ?? '')} onChange={(v) => u({ quantity: Number(v) || 0 })} /></Field>
            <Field label="Entry price"><TextInput value={String(h.entryPrice ?? '')} onChange={(v) => u({ entryPrice: Number(v) || 0 })} /></Field>
            <Field label="Average cost"><TextInput value={String(h.averageCost ?? '')} onChange={(v) => u({ averageCost: Number(v) || 0 })} /></Field>
            <Field label="Current price (blank = live API)"><TextInput value={h.currentPrice === null || h.currentPrice === undefined ? '' : String(h.currentPrice)} onChange={(v) => u({ currentPrice: v === '' ? null : Number(v) })} /></Field>
            <Field label="Target price"><TextInput value={h.targetPrice === null || h.targetPrice === undefined ? '' : String(h.targetPrice)} onChange={(v) => u({ targetPrice: v === '' ? null : Number(v) })} /></Field>
            <Field label="Stop loss"><TextInput value={h.stopLoss === null || h.stopLoss === undefined ? '' : String(h.stopLoss)} onChange={(v) => u({ stopLoss: v === '' ? null : Number(v) })} /></Field>
            <Field label="Target allocation %"><TextInput value={String(h.targetAllocation ?? '')} onChange={(v) => u({ targetAllocation: Number(v) || 0 })} /></Field>
          </div>

          {['Exited', 'Closed'].includes(h.status) && (
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Exit date"><TextInput value={h.exitDate || ''} onChange={(v) => u({ exitDate: v })} /></Field>
              <Field label="Exit price"><TextInput value={h.exitPrice === null || h.exitPrice === undefined ? '' : String(h.exitPrice)} onChange={(v) => u({ exitPrice: v === '' ? null : Number(v) })} /></Field>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <Field label="Investment horizon"><TextInput value={h.horizon} onChange={(v) => u({ horizon: v })} placeholder="5+ years" /></Field>
            <Field label="Logo"><SelectInput value={h.logoUrl || ''} onChange={(v) => u({ logoUrl: v })} options={imageOptions} /></Field>
            <Field label="Cover image"><SelectInput value={h.coverImageUrl || ''} onChange={(v) => u({ coverImageUrl: v })} options={imageOptions} /></Field>
            <Field label="Enabled">
              <SelectInput value={h.enabled === false ? 'no' : 'yes'} onChange={(v) => u({ enabled: v === 'yes' })} options={[{ label: 'Enabled', value: 'yes' }, { label: 'Disabled', value: 'no' }]} />
            </Field>
          </div>

          <Field label="Notes"><TextArea value={h.notes} onChange={(v) => u({ notes: v })} rows={2} /></Field>
          <Field label="Tags"><StringListField items={h.tags || []} onChange={(v) => u({ tags: v })} placeholder="Core" /></Field>

          <MemoEditor memo={h.memo} onChange={(v) => u({ memo: v })} />
        </div>
      )}
    />
  )
}

function LabJournalEditor({ lab, onChange }) {
  const items = lab?.journal || []
  const TYPES = ['Buy', 'Sell', 'Increase', 'Reduce', 'Watchlist', 'Research Update', 'Reflection']
  return (
    <ObjectListField
      items={items}
      onChange={(v) => onChange({ ...lab, journal: v })}
      addLabel="Add journal entry"
      newItem={{ id: `j-${Date.now().toString(36)}`, date: '', type: 'Reflection', title: '', body: '', holdingId: '', tags: [], attachments: [] }}
      render={(e, u) => (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <Field label="Date"><TextInput value={e.date} onChange={(v) => u({ date: v })} placeholder="2024-02-05" /></Field>
            <Field label="Type"><SelectInput value={e.type} onChange={(v) => u({ type: v })} options={TYPES.map((t) => ({ label: t, value: t }))} /></Field>
            <Field label="Linked holding ID"><TextInput value={e.holdingId || ''} onChange={(v) => u({ holdingId: v })} placeholder="h-hdfcbank" /></Field>
          </div>
          <Field label="Title"><TextInput value={e.title} onChange={(v) => u({ title: v })} /></Field>
          <Field label="Body"><TextArea value={e.body} onChange={(v) => u({ body: v })} rows={4} /></Field>
          <Field label="Tags"><StringListField items={e.tags || []} onChange={(v) => u({ tags: v })} /></Field>
        </div>
      )}
    />
  )
}

function LabLettersEditor({ lab, onChange }) {
  const items = lab?.letters || []
  return (
    <ObjectListField
      items={items}
      onChange={(v) => onChange({ ...lab, letters: v })}
      addLabel="Add quarterly letter"
      newItem={{ id: `q-${Date.now().toString(36)}`, quarter: '', date: '', title: '', summary: '', marketView: '', portfolioReview: '', lessons: '', pdfUrl: '' }}
      render={(l, u) => (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <Field label="Quarter"><TextInput value={l.quarter} onChange={(v) => u({ quarter: v })} placeholder="Q1 2024" /></Field>
            <Field label="Date"><TextInput value={l.date} onChange={(v) => u({ date: v })} placeholder="2024-04-05" /></Field>
            <Field label="PDF URL"><TextInput value={l.pdfUrl || ''} onChange={(v) => u({ pdfUrl: v })} /></Field>
          </div>
          <Field label="Title"><TextInput value={l.title} onChange={(v) => u({ title: v })} /></Field>
          <Field label="Summary"><TextArea value={l.summary} onChange={(v) => u({ summary: v })} rows={2} /></Field>
          <Field label="Market view"><TextArea value={l.marketView} onChange={(v) => u({ marketView: v })} rows={2} /></Field>
          <Field label="Portfolio review"><TextArea value={l.portfolioReview} onChange={(v) => u({ portfolioReview: v })} rows={3} /></Field>
          <Field label="Lessons"><TextArea value={l.lessons} onChange={(v) => u({ lessons: v })} rows={2} /></Field>
        </div>
      )}
    />
  )
}

function LabNotesEditor({ lab, onChange }) {
  const items = lab?.notes || []
  const CATS = ['Valuation', 'Industry', 'Macro', 'Company', 'M&A', 'Ideas']
  return (
    <ObjectListField
      items={items}
      onChange={(v) => onChange({ ...lab, notes: v })}
      addLabel="Add research note"
      newItem={{ id: `rn-${Date.now().toString(36)}`, title: '', category: 'Valuation', date: '', summary: '', body: '', tags: [], fileUrl: '' }}
      render={(n, u) => (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <Field label="Category"><SelectInput value={n.category} onChange={(v) => u({ category: v })} options={CATS.map((c) => ({ label: c, value: c }))} /></Field>
            <Field label="Date"><TextInput value={n.date} onChange={(v) => u({ date: v })} /></Field>
            <Field label="File URL"><TextInput value={n.fileUrl || ''} onChange={(v) => u({ fileUrl: v })} /></Field>
          </div>
          <Field label="Title"><TextInput value={n.title} onChange={(v) => u({ title: v })} /></Field>
          <Field label="Summary"><TextArea value={n.summary} onChange={(v) => u({ summary: v })} rows={2} /></Field>
          <Field label="Body (markdown)"><TextArea value={n.body || ''} onChange={(v) => u({ body: v })} rows={5} /></Field>
          <Field label="Tags"><StringListField items={n.tags || []} onChange={(v) => u({ tags: v })} /></Field>
        </div>
      )}
    />
  )
}

function ContentTab({ imageFiles }) {
  const [content, setContent] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [section, setSection] = useState('owner')

  useEffect(() => {
    fetch('/api/content').then((r) => r.json()).then((d) => setContent({ ...SEED_CONTENT, ...d })).catch(() => setContent(SEED_CONTENT))
  }, [])

  const patch = (k, v) => { setContent((c) => ({ ...c, [k]: v })); setDirty(true) }

  const save = async () => {
    setSaving(true)
    try {
      const res = await adminFetch('/api/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(content) })
      if (res.ok) { setSavedAt(new Date()); setDirty(false) }
      else { const d = await res.json(); alert(d.error || 'Save failed') }
    } finally { setSaving(false) }
  }

  const reset = async () => {
    if (!confirm('Reset ALL content to defaults? This will overwrite all your edits.')) return
    const res = await adminFetch('/api/content/reset', { method: 'POST' })
    if (res.ok) { const d = await res.json(); setContent(d.content); setDirty(false); setSavedAt(new Date()) }
  }

  if (!content) return <div className="p-10 text-center text-neutral-400">Loading content…</div>

  const sections = [
    { id: 'owner', label: 'Owner & Intelligence', icon: User },
    { id: 'philosophy', label: 'Philosophy', icon: Sparkles },
    { id: 'chapters', label: 'Chapters', icon: Layers },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'skills', label: 'Skills', icon: Award },
    { id: 'experience', label: 'Experience', icon: LineChart },
    { id: 'education', label: 'Education', icon: Award },
    { id: 'certifications', label: 'Certifications', icon: Check },
    { id: 'research', label: 'Research', icon: BarChart3 },
    { id: 'categories', label: 'Categories', icon: BarChart3 },
    { id: 'lab-settings', label: 'Lab · Portfolio', icon: Settings },
    { id: 'lab-holdings', label: 'Lab · Instruments', icon: Layers },
    { id: 'lab-journal', label: 'Lab · Journal', icon: LineChart },
    { id: 'lab-letters', label: 'Lab · Letters', icon: User },
    { id: 'lab-notes', label: 'Lab · Research', icon: BarChart3 },
    { id: 'danger', label: 'Danger zone', icon: ShieldAlert },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
          {sections.map((s) => {
            const Icon = s.icon
            return (
              <button key={s.id} onClick={() => setSection(s.id)} className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition ${section === s.id ? 'bg-gold/15 text-gold-soft border border-gold/20' : 'text-neutral-300 hover:bg-white/[0.04] border border-transparent'}`}>
                <Icon className="h-3.5 w-3.5" /> {s.label}
              </button>
            )
          })}
        </div>
      </aside>
      <div>
        <div className="sticky top-0 z-30 -mx-6 px-6 -mt-2 pt-2 pb-3 bg-[#0A0A0B]/85 backdrop-blur border-b border-white/5 flex items-center justify-between gap-3">
          <div className="text-[12px] text-neutral-500">
            {dirty ? <span className="text-gold-soft">Unsaved changes</span> : savedAt ? <span>Saved {savedAt.toLocaleTimeString()}</span> : 'All up to date'}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={save} disabled={saving || !dirty} className="bg-gold text-neutral-900 hover:bg-gold-soft rounded-full h-9">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Save changes
            </Button>
          </div>
        </div>

        <div className="mt-6">
          {section === 'owner' && <OwnerEditor owner={content.owner} onChange={(v) => patch('owner', v)} imageFiles={imageFiles} />}
          {section === 'philosophy' && <PhilosophyEditor philosophy={content.philosophy} onChange={(v) => patch('philosophy', v)} />}
          {section === 'chapters' && <ChaptersEditor chapters={content.chapters} onChange={(v) => patch('chapters', v)} />}
          {section === 'projects' && <ProjectsEditor projects={content.projects} onChange={(v) => patch('projects', v)} imageFiles={imageFiles} />}
          {section === 'skills' && <SkillsEditor skills={content.skills} onChange={(v) => patch('skills', v)} />}
          {section === 'experience' && <ExperienceEditor experience={content.experience} onChange={(v) => patch('experience', v)} />}
          {section === 'education' && <EducationEditor education={content.education} onChange={(v) => patch('education', v)} />}
          {section === 'certifications' && <CertificationsEditor certifications={content.certifications} onChange={(v) => patch('certifications', v)} imageFiles={imageFiles} />}
          {section === 'research' && <ResearchEditor research={content.research} onChange={(v) => patch('research', v)} />}
          {section === 'categories' && <CategoriesEditor categories={content.categories} onChange={(v) => patch('categories', v)} />}
          {section === 'lab-settings' && <LabSettingsEditor lab={content.lab} onChange={(v) => patch('lab', v)} />}
          {section === 'lab-holdings' && <LabHoldingsEditor lab={content.lab} onChange={(v) => patch('lab', v)} imageFiles={imageFiles} />}
          {section === 'lab-journal' && <LabJournalEditor lab={content.lab} onChange={(v) => patch('lab', v)} />}
          {section === 'lab-letters' && <LabLettersEditor lab={content.lab} onChange={(v) => patch('lab', v)} />}
          {section === 'lab-notes' && <LabNotesEditor lab={content.lab} onChange={(v) => patch('lab', v)} />}
          {section === 'danger' && (
            <div className="p-6 rounded-2xl border border-red-500/30 bg-red-500/[0.03]">
              <div className="flex items-center gap-2 text-red-300"><ShieldAlert className="h-4 w-4" /> <span className="font-medium">Danger zone</span></div>
              <p className="mt-3 text-[14px] text-neutral-300 max-w-lg">Reset every content section back to the seeded sample content. Your uploaded files are not touched.</p>
              <Button onClick={reset} className="mt-5 bg-red-500 hover:bg-red-400 text-white h-9 rounded-full">
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset all content to defaults
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ==================== CONNECTIONS TAB ==================== */

function StatusDot({ ok }) {
  return <span className={`h-2 w-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
}


function CopyRow({ k, v }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(v); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-white/[0.06]">
      <span className="font-mono text-[10.5px] text-gold/80 w-[190px] shrink-0 truncate">{k}</span>
      <span className="font-mono text-[10.5px] text-neutral-400 flex-1 truncate">{v.length > 42 ? v.slice(0, 20) + '…' + v.slice(-8) : v}</span>
      <button onClick={copy} className="text-[10px] px-2 py-1 rounded border border-white/10 hover:bg-white/5 text-neutral-300 shrink-0">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

function CheckLine({ ok, children }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
      <span className={ok ? 'text-neutral-300' : 'text-neutral-500'}>{children}</span>
    </div>
  )
}

function SupabaseCard({ status, onRecheck }) {
  const live = status?.supabase
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [bucket, setBucket] = useState(live?.bucket || 'portfolio-files')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState(null)

  const test = async () => {
    setTesting(true); setResult(null)
    try {
      const r = await adminFetch('/api/admin/test-supabase', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, key, bucket }),
      })
      setResult(await r.json())
    } catch (e) {
      setResult({ ok: false, error: 'Network error while testing.' })
    } finally { setTesting(false) }
  }

  return (
    <div className="p-6 rounded-2xl border border-white/[0.07] bg-white/[0.015]">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Database className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 font-serif text-lg">Supabase <StatusDot ok={!!live?.ok} /></div>
          <div className="text-[12px] text-neutral-500">
            {live?.ok ? `Connected · ${live.urlHost}` : live?.configured ? `Configured (${live.urlHost}) but unreachable` : 'Not connected'}
          </div>
        </div>
        <button onClick={onRecheck} className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-white/10 hover:bg-white/5">
          <RefreshCw className="h-3 w-3" /> Recheck
        </button>
      </div>

      {/* wizard */}
      <div className="mt-5 pt-5 border-t border-white/[0.06]">
        <div className="text-[11px] uppercase tracking-widest text-neutral-500">Connect your Supabase account</div>
        <div className="mt-1.5 text-[12px] text-neutral-500 leading-relaxed">
          Paste your project credentials below and test them live. Supabase → Project Settings → Data API for the URL, and API Keys for the <span className="font-mono text-neutral-400">service_role</span> key.
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Project URL"><TextInput value={url} onChange={setUrl} placeholder="https://abcdefgh.supabase.co" /></Field>
          <Field label="Storage bucket"><TextInput value={bucket} onChange={setBucket} placeholder="portfolio-files" /></Field>
        </div>
        <div className="mt-3">
          <Field label="service_role key" hint="Never stored by this app — used only for this live test.">
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="eyJhbGciOi…"
              className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-gold/40" />
          </Field>
        </div>

        <Button onClick={test} disabled={testing || !url || !key} className="mt-4 bg-gold text-neutral-900 hover:bg-gold-soft h-9 rounded-full disabled:opacity-40">
          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />}
          Test connection
        </Button>

        {result && (
          <div className={`mt-4 p-4 rounded-lg border ${result.ok ? 'border-emerald-500/25 bg-emerald-500/[0.05]' : 'border-gold/25 bg-gold/[0.05]'}`}>
            <div className={`text-[13px] ${result.ok ? 'text-emerald-300' : 'text-gold-soft'}`}>
              {result.ok ? '✓ ' : '! '}{result.message || result.error}
            </div>

            {result.checks && (
              <div className="mt-3 space-y-1.5">
                <CheckLine ok={result.checks.authenticated}>Credentials accepted</CheckLine>
                {Object.entries(result.checks.tables || {}).map(([t, ok]) => (
                  <CheckLine key={t} ok={ok}>Table <span className="font-mono">{t}</span></CheckLine>
                ))}
                <CheckLine ok={result.checks.bucket}>Storage bucket <span className="font-mono">{bucket}</span> {result.checks.bucket ? '' : '(auto-created on first upload)'}</CheckLine>
              </div>
            )}

            {result.missingTables?.length > 0 && (
              <div className="mt-3 text-[12px] text-neutral-400 leading-relaxed">
                Run <span className="font-mono text-gold/80">supabase/schema.sql</span> in your Supabase SQL editor, then test again.
              </div>
            )}

            {result.ok && !result.alreadyLive && (
              <div className="mt-4">
                <div className="text-[11px] uppercase tracking-widest text-neutral-500">Final step — add these to your host</div>
                <div className="mt-1.5 text-[12px] text-neutral-500 leading-relaxed">
                  These can&apos;t be saved from this screen: the app runs on read-only serverless storage, and a web-writable <span className="font-mono">service_role</span> key would let anyone with an admin session take your whole database. Paste them into Vercel → Settings → Environment Variables, then redeploy. That makes them permanent.
                </div>
                <div className="mt-3 space-y-1.5">
                  {result.envVars.map((e) => <CopyRow key={e.key} k={e.key} v={e.value} />)}
                </div>
                <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-gold/80 hover:text-gold">
                  Open Vercel dashboard <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {result.ok && result.alreadyLive && (
              <div className="mt-2 text-[12px] text-neutral-400">These credentials match the ones already live. Nothing more to do.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch {}
  }
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0 rounded-md bg-black/40 border border-white/[0.08] px-2.5 py-1.5">
        <div className="text-[8.5px] uppercase tracking-[0.14em] text-neutral-600">{label}</div>
        <div className="text-[11px] font-mono text-neutral-300 truncate">{value}</div>
      </div>
      <button onClick={copy} title="Copy"
        className="h-8 w-8 shrink-0 rounded-md border border-white/[0.1] hover:bg-white/[0.05] flex items-center justify-center text-neutral-400 hover:text-gold transition">
        {copied ? <Check className="h-3.5 w-3.5 text-terminal" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

function SupabaseSetup({ status, onRecheck }) {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState(null)
  const live = !!status?.supabase?.ok

  const test = async () => {
    setTesting(true); setResult(null)
    try {
      const r = await adminFetch('/api/admin/test-supabase', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), key: key.trim(), bucket: status?.supabase?.bucket || 'portfolio-files' }),
      })
      setResult(await r.json())
    } catch (e) {
      setResult({ ok: false, error: String(e?.message || e) })
    } finally { setTesting(false) }
  }

  return (
    <div className="p-6 rounded-2xl border border-white/[0.07] bg-white/[0.015]">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${live ? 'bg-terminal/10 border-terminal/25' : 'bg-white/[0.03] border-white/10'}`}>
          <Database className={`h-4 w-4 ${live ? 'text-terminal' : 'text-neutral-500'}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 font-serif text-lg">Supabase <StatusDot ok={live} /></div>
          <div className="text-[12px] text-neutral-500">Content database + file storage</div>
        </div>
        <button onClick={onRecheck} className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-white/10 hover:bg-white/5">
          <RefreshCw className="h-3 w-3" /> Recheck
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
          <div className="text-neutral-500 uppercase tracking-widest text-[10px]">Live project</div>
          <div className="mt-1 font-mono text-neutral-200 truncate">{status?.supabase?.urlHost || 'Not configured'}</div>
        </div>
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
          <div className="text-neutral-500 uppercase tracking-widest text-[10px]">Storage bucket</div>
          <div className="mt-1 font-mono text-neutral-200">{status?.supabase?.bucket || '—'}</div>
        </div>
      </div>

      {/* --- credential tester --- */}
      <div className="mt-5 pt-5 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Link2 className="h-3.5 w-3.5 text-gold" />
          <div className="text-[12.5px] text-neutral-200">Connect your Supabase account</div>
        </div>
        <p className="mt-1.5 text-[11.5px] text-neutral-500 leading-relaxed">
          Paste your credentials below and press <span className="text-neutral-300">Test connection</span>. Nothing is saved here —
          this verifies the keys actually work, then gives you the exact values to paste into Vercel. (See the note below for why it works this way.)
        </p>

        <div className="mt-3.5 space-y-2.5">
          <Field label="Project URL">
            <TextInput value={url} onChange={setUrl} placeholder="https://xxxxxxxx.supabase.co" />
          </Field>
          <Field label="service_role key (Settings → API → service_role)">
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)}
              placeholder="eyJhbGciOi..." autoComplete="off"
              className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-gold/40" />
          </Field>
          <div className="flex items-center gap-2">
            <Button onClick={test} disabled={testing || !url || !key}
              className="bg-gold text-neutral-900 hover:bg-gold-soft h-9 rounded-md text-[12px] disabled:opacity-40">
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />}
              Test connection
            </Button>
            <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
              className="text-[11px] text-neutral-500 hover:text-neutral-200 inline-flex items-center gap-1">
              Open Supabase <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* --- result --- */}
        {result && (
          <div className={`mt-4 p-4 rounded-lg border text-[12px] leading-relaxed ${
            result.ok ? 'bg-terminal/[0.06] border-terminal/25 text-terminal-soft'
                      : 'bg-destructive/[0.06] border-destructive/25 text-red-300'
          }`}>
            <div className="flex items-center gap-1.5 font-medium">
              {result.ok ? <ShieldCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {result.ok ? 'Connection verified' : 'Connection failed'}
            </div>
            <div className="mt-1 text-neutral-300">{result.message || result.error}</div>

            {result.checks?.tables && (
              <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                {Object.entries(result.checks.tables).map(([t, ok]) => (
                  <div key={t} className="flex items-center gap-1.5 text-[11px]">
                    {ok ? <Check className="h-3 w-3 text-terminal" /> : <X className="h-3 w-3 text-red-400" />}
                    <span className="font-mono text-neutral-400">{t}</span>
                  </div>
                ))}
              </div>
            )}
            {result.checks && !result.checks.bucket && (
              <div className="mt-2 text-[11px] text-neutral-500">
                Bucket “{status?.supabase?.bucket || 'portfolio-files'}” not found yet — it is created automatically on your first upload.
              </div>
            )}

            {result.ok && (
              <div className="mt-4 pt-3.5 border-t border-white/[0.08]">
                <div className="text-[11.5px] text-neutral-200 font-medium">Last step — make it permanent</div>
                <div className="mt-1 text-[11px] text-neutral-500">
                  Add these in Vercel → your project → Settings → Environment Variables, then Redeploy. After that this panel turns green on its own.
                </div>
                <div className="mt-2.5 space-y-1.5">
                  {(result.envVars || []).map((v) => (
                    <CopyField key={v.key} label={v.key} value={v.value} />
                  ))}
                </div>
                {result.alreadyLive && (
                  <div className="mt-2.5 text-[11px] text-terminal-soft inline-flex items-center gap-1.5">
                    <Check className="h-3 w-3" /> These are already the live credentials — nothing further to do.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <details className="mt-4 group">
          <summary className="cursor-pointer text-[11px] text-neutral-500 hover:text-neutral-300 select-none">
            Why can&apos;t this just save the key permanently from here?
          </summary>
          <div className="mt-2 p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-[11.5px] text-neutral-400 leading-relaxed space-y-2">
            <p>
              Two hard reasons, not a shortcut:
            </p>
            <p>
              <span className="text-neutral-200">1. Chicken-and-egg.</span> The only permanent store this app has <em>is</em> Supabase.
              Saving the Supabase key into Supabase would require the key you&apos;re trying to set.
            </p>
            <p>
              <span className="text-neutral-200">2. Vercel has no writable disk.</span> Serverless functions run on a read-only,
              ephemeral filesystem — anything written vanishes on the next request, so there&apos;s nowhere to persist it.
            </p>
            <p>
              There&apos;s also a security upside: the <span className="font-mono text-neutral-300">service_role</span> key bypasses all
              row-level security. Keeping it in Vercel&apos;s encrypted env vars means even a stolen admin session can never read or leak it.
              Env vars <em>are</em> the permanent store — you set them once and never touch them again.
            </p>
          </div>
        </details>
      </div>
    </div>
  )
}

function ConnectionsTab() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [driveConnecting, setDriveConnecting] = useState(false)
  const [driveConnected, setDriveConnected] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await adminFetch('/api/admin/status'); const d = await r.json(); setStatus(d) }
    catch { setStatus(null) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const connectDrive = async () => {
    setDriveConnecting(true)
    try {
      const { requestDriveAccessToken } = await import('@/lib/google-drive-client')
      const token = await requestDriveAccessToken()
      if (token) setDriveConnected(true)
    } catch (e) {
      alert(e?.message || 'Could not connect to Google Drive.')
    } finally { setDriveConnecting(false) }
  }

  if (loading) return <div className="p-10 text-center text-neutral-400">Checking connections…</div>

  return (
    <div className="space-y-5 max-w-3xl">
      <SupabaseSetup status={status} onRecheck={load} />

      {/* Google Drive */}
      <div className="p-6 rounded-2xl border border-white/[0.07] bg-white/[0.015]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"><Link2 className="h-4 w-4 text-blue-400" /></div>
          <div className="flex-1">
            <div className="flex items-center gap-2 font-serif text-lg">Google Drive <StatusDot ok={!!status?.googleDrive?.configured} /></div>
            <div className="text-[12px] text-neutral-500">Attach files from your Drive without uploading a copy</div>
          </div>
          <Button size="sm" disabled={!status?.googleDrive?.configured || driveConnecting} onClick={connectDrive}
            className="bg-white/10 hover:bg-white/15 text-white rounded-full h-8 text-[12px]">
            {driveConnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            {driveConnected ? 'Reconnect' : 'Connect'}
          </Button>
        </div>
        {!status?.googleDrive?.configured ? (
          <div className="mt-4 p-4 rounded-lg bg-white/[0.03] border border-white/10 text-[12px] text-neutral-400 leading-relaxed">
            In Google Cloud Console: enable the <span className="text-neutral-200">Google Picker API</span>, create an OAuth Client ID (Web)
            with your site URL under Authorized JavaScript origins, and an API key. Then add
            <span className="font-mono text-neutral-300"> NEXT_PUBLIC_GOOGLE_CLIENT_ID</span> and
            <span className="font-mono text-neutral-300"> NEXT_PUBLIC_GOOGLE_API_KEY</span> in Vercel and redeploy.
            These two are public-by-design (restricted to your domain), unlike the Supabase key.
          </div>
        ) : (
          <div className="mt-4 text-[12px] text-neutral-500">Configured. Use “Attach from Google Drive” in the <span className="text-neutral-300">Files</span> tab.</div>
        )}
      </div>

      {/* Admin password */}
      <div className="p-6 rounded-2xl border border-white/[0.07] bg-white/[0.015]">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${status?.admin?.usingDefaultPassword ? 'bg-gold/10 border-gold/20' : 'bg-terminal/10 border-terminal/25'}`}>
            {status?.admin?.usingDefaultPassword ? <AlertTriangle className="h-4 w-4 text-gold" /> : <ShieldCheck className="h-4 w-4 text-terminal" />}
          </div>
          <div className="flex-1">
            <div className="font-serif text-lg">Admin password</div>
            <div className="text-[12px] text-neutral-500">
              {status?.admin?.usingDefaultPassword
                ? 'Using the default password “admin” — your session is secure, but the password is guessable.'
                : 'A custom ADMIN_PASSWORD is set.'}
            </div>
          </div>
        </div>
        {status?.admin?.usingDefaultPassword && (
          <div className="mt-4 p-4 rounded-lg bg-gold/[0.06] border border-gold/20 text-[12px] text-gold-soft/90 leading-relaxed">
            Set <span className="font-mono">ADMIN_PASSWORD</span> in Vercel → Environment Variables, then redeploy.
            The login session itself is already secure — a signed, httpOnly cookie, never stored in localStorage.
          </div>
        )}
      </div>
    </div>
  )
}

/* ==================== ANALYTICS TAB ==================== */

function MiniBarChart({ series }) {
  const max = Math.max(1, ...series.map((d) => d.views))
  const w = 680, h = 160, pad = 24, barW = (w - pad * 2) / series.length
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[160px]">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={pad} x2={w - pad} y1={h - pad - (h - pad * 1.5) * f} y2={h - pad - (h - pad * 1.5) * f} stroke="rgba(255,255,255,0.05)" />
      ))}
      {series.map((d, i) => {
        const barH = (d.views / max) * (h - pad * 1.5)
        const x = pad + i * barW
        return (
          <g key={d.date}>
            <rect x={x + barW * 0.18} y={h - pad - barH} width={barW * 0.64} height={barH} rx={2} fill="url(#goldGrad)" />
          </g>
        )
      })}
      <defs>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function AnalyticsTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const r = await adminFetch('/api/admin/analytics?days=14')
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || 'Failed to load analytics') }
      setData(await r.json())
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const deviceIcon = (d) => (d === 'mobile' ? Smartphone : d === 'tablet' ? Tablet : Monitor)

  if (loading) return <div className="p-10 text-center text-neutral-400">Loading analytics…</div>
  if (err) return (
    <div className="p-6 rounded-2xl border border-gold/20 bg-gold/[0.05] text-[13px] text-gold-soft/90">
      {err}. If this is a fresh Supabase project, make sure you've run the latest <span className="font-mono">supabase/schema.sql</span> (it adds the <span className="font-mono">analytics_events</span> table).
    </div>
  )
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Views (14d)', value: data.totalViews, icon: Eye },
          { label: 'Unique visitors', value: data.uniqueSessions, icon: Users },
          { label: 'Recruiter Mode views', value: data.recruiterModeViews, icon: Sparkles },
          { label: 'Avg. views / visitor', value: data.uniqueSessions ? (data.totalViews / data.uniqueSessions).toFixed(1) : '0', icon: Activity },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="p-5 rounded-2xl border border-white/[0.07] bg-white/[0.015]">
              <Icon className="h-4 w-4 text-gold/70" />
              <div className="mt-3 font-serif text-3xl tnum">{s.value}</div>
              <div className="mt-1 text-[10.5px] uppercase tracking-[0.16em] text-neutral-500">{s.label}</div>
            </div>
          )
        })}
      </div>

      <div className="p-6 rounded-2xl border border-white/[0.07] bg-white/[0.015]">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Daily views · last {data.rangeDays} days</div>
          <button onClick={load} className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-white/10 hover:bg-white/5"><RefreshCw className="h-3 w-3" /> Refresh</button>
        </div>
        <div className="mt-4">
          {data.dailySeries.every((d) => d.views === 0) ? (
            <div className="py-10 text-center text-[13px] text-neutral-500">No visits recorded yet — this fills in as people visit the site.</div>
          ) : <MiniBarChart series={data.dailySeries} />}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-white/[0.07] bg-white/[0.015]">
          <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 mb-3">Top pages</div>
          <div className="space-y-2">
            {data.topPaths.length === 0 && <div className="text-[12px] text-neutral-600">No data yet</div>}
            {data.topPaths.map((p) => (
              <div key={p.label} className="flex items-center justify-between text-[13px]">
                <span className="text-neutral-300 truncate font-mono">{p.label}</span>
                <span className="text-neutral-500 tnum">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-5 rounded-2xl border border-white/[0.07] bg-white/[0.015]">
          <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 mb-3">Top referrers</div>
          <div className="space-y-2">
            {data.topReferrers.length === 0 && <div className="text-[12px] text-neutral-600">No data yet</div>}
            {data.topReferrers.map((r) => (
              <div key={r.label} className="flex items-center justify-between text-[13px]">
                <span className="text-neutral-300 truncate">{r.label === 'Direct' ? r.label : (() => { try { return new URL(r.label).host } catch { return r.label } })()}</span>
                <span className="text-neutral-500 tnum">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-5 rounded-2xl border border-white/[0.07] bg-white/[0.015]">
          <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 mb-3">Devices</div>
          <div className="space-y-2">
            {data.deviceBreakdown.length === 0 && <div className="text-[12px] text-neutral-600">No data yet</div>}
            {data.deviceBreakdown.map((d) => {
              const Icon = deviceIcon(d.label)
              return (
                <div key={d.label} className="flex items-center justify-between text-[13px]">
                  <span className="text-neutral-300 capitalize flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-neutral-500" /> {d.label}</span>
                  <span className="text-neutral-500 tnum">{d.count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}



export default function AdminPage() {
  const { status, refresh, logout } = useAdminSession()
  const [tab, setTab] = useState('content')
  const [projectsForFiles, setProjectsForFiles] = useState([])
  const [imageFiles, setImageFiles] = useState([])

  useEffect(() => {
    if (status !== 'authed') return
    // fetch projects list for file attach dropdowns
    fetch('/api/content').then((r) => r.json()).then((d) => setProjectsForFiles((d?.projects || []).map((p) => ({ id: p.id, title: p.title })))).catch(() => {})
    // fetch image files for portrait/cover selectors
    fetch('/api/files').then((r) => r.json()).then((d) => setImageFiles((Array.isArray(d) ? d : []).filter((f) => f.category === 'image'))).catch(() => {})
  }, [status, tab])

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-5 w-5 text-neutral-500 animate-spin" />
      </div>
    )
  }
  if (status !== 'authed') return <LoginGate onAuthed={refresh} />

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-neutral-100">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/" className="inline-flex items-center gap-1.5 text-[12px] text-neutral-400 hover:text-white transition"><ArrowLeft className="h-3.5 w-3.5" /> Back to site</Link>
            <h1 className="mt-3 font-serif text-4xl md:text-5xl tracking-tight">Admin</h1>
            <p className="mt-2 text-[14px] text-neutral-400">Edit every element on the site, manage files and connections, and see visitor analytics.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-neutral-500">
              <Sparkles className="h-3.5 w-3.5 text-gold" /> Storage: Supabase
            </div>
            <button onClick={logout} className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/5 transition"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
          </div>
        </div>

        <div className="mt-8 inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.03] border border-white/5 flex-wrap">
          <button onClick={() => setTab('content')} className={`px-4 py-1.5 rounded-full text-[13px] transition ${tab === 'content' ? 'bg-gold text-neutral-900' : 'text-neutral-300 hover:text-white'}`}>Content</button>
          <button onClick={() => setTab('files')} className={`px-4 py-1.5 rounded-full text-[13px] transition ${tab === 'files' ? 'bg-gold text-neutral-900' : 'text-neutral-300 hover:text-white'}`}>Files</button>
          <button onClick={() => setTab('analytics')} className={`px-4 py-1.5 rounded-full text-[13px] transition ${tab === 'analytics' ? 'bg-gold text-neutral-900' : 'text-neutral-300 hover:text-white'}`}>Analytics</button>
          <button onClick={() => setTab('connections')} className={`px-4 py-1.5 rounded-full text-[13px] transition ${tab === 'connections' ? 'bg-gold text-neutral-900' : 'text-neutral-300 hover:text-white'}`}>Connections</button>
        </div>

        <div className="mt-8">
          {tab === 'content' && <ContentTab imageFiles={imageFiles} />}
          {tab === 'files' && <FilesTab projects={projectsForFiles} />}
          {tab === 'analytics' && <AnalyticsTab />}
          {tab === 'connections' && <ConnectionsTab />}
        </div>
      </div>
    </div>
  )
}
