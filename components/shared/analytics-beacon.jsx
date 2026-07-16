'use client'
import { useEffect } from 'react'

const SESSION_KEY = 'pf_session_id'

function getSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return 'anon'
  }
}

function detectDevice() {
  const w = window.innerWidth
  if (w < 640) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

function detectBrowser() {
  const ua = navigator.userAgent
  if (/Edg\//.test(ua)) return 'Edge'
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari'
  if (/Firefox\//.test(ua)) return 'Firefox'
  return 'Other'
}

// First-party, cookie-free pageview beacon. Fires once per mount (this is
// a single-page site) — no PII, no third-party trackers, no fingerprinting.
export function AnalyticsBeacon({ recruiterMode }) {
  useEffect(() => {
    const payload = {
      sessionId: getSessionId(),
      path: window.location.pathname || '/',
      referrer: document.referrer || '',
      device: detectDevice(),
      browser: detectBrowser(),
      recruiterMode: !!recruiterMode,
    }
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
