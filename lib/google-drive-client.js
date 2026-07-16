'use client'
// Client-side Google Drive attach flow.
// Uses Google Identity Services (OAuth token client) + the Picker API.
// Needs two PUBLIC env vars (safe to expose — restricted by Google Cloud
// Console to your site's origin, same as any client-side Google widget):
//   NEXT_PUBLIC_GOOGLE_CLIENT_ID
//   NEXT_PUBLIC_GOOGLE_API_KEY
// See README.md "Google Drive setup" for the Cloud Console steps.

const SCOPE = 'https://www.googleapis.com/auth/drive.file'

let gisLoaded = false
let pickerLoaded = false

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

async function ensureScripts() {
  if (!gisLoaded) {
    await loadScript('https://accounts.google.com/gsi/client')
    gisLoaded = true
  }
  if (!pickerLoaded) {
    await loadScript('https://apis.google.com/js/api.js')
    await new Promise((resolve) => window.gapi.load('picker', resolve))
    pickerLoaded = true
  }
}

export function isGoogleDriveConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && process.env.NEXT_PUBLIC_GOOGLE_API_KEY)
}

// Requests a short-lived OAuth access token via the user's Google account
// (a popup consent screen). Token is kept only in memory / sessionStorage
// for this admin session — never sent to our server, never persisted.
export async function requestDriveAccessToken() {
  await ensureScripts()
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured')
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp?.access_token) resolve(resp.access_token)
        else reject(new Error(resp?.error || 'Google sign-in failed'))
      },
    })
    client.requestAccessToken({ prompt: '' })
  })
}

// Opens the Drive file picker; resolves with a normalised attachment object
// (or null if the user cancels).
export async function openDrivePicker(accessToken) {
  await ensureScripts()
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
  if (!apiKey) throw new Error('NEXT_PUBLIC_GOOGLE_API_KEY is not configured')

  return new Promise((resolve) => {
    const view = new window.google.picker.DocsView()
      .setIncludeFolders(false)
      .setSelectFolderEnabled(false)

    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setCallback((data) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const doc = data.docs?.[0]
          if (!doc) return resolve(null)
          resolve({
            name: doc.name,
            url: doc.url,
            iconUrl: doc.iconUrl,
            mimeType: doc.mimeType,
            size: doc.sizeBytes ? Number(doc.sizeBytes) : 0,
            driveId: doc.id,
          })
        } else if (data.action === window.google.picker.Action.CANCEL) {
          resolve(null)
        }
      })
      .build()
    picker.setVisible(true)
  })
}
