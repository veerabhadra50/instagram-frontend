import { useState } from 'react'
import { api } from './api'

interface Profile {
  username: string; full_name: string; biography: string
  followers: number; following: number; posts_count: number
  is_private: boolean; is_business: boolean; is_creator: boolean
  profile_pic: string; reels_count: number; avg_reel_views: number
  avg_likes: number; avg_comments: number; collab_count: number
  images_count: number; videos_in_posts: number
}
interface MediaItem { id: string; code?: string; thumbnail: string; likes: number; comments: number; views: number; shares: number; date: string; media_type?: string }

const proxyImg = (url: string) => url ? `${import.meta.env.VITE_PROXY_BASE}/proxy-image?url=${encodeURIComponent(url)}` : ''
const fmt = (n: number) => (n || 0).toLocaleString()

function extractUsername(input: string) {
  const match = input.match(/instagram\.com\/([^/?#]+)/)
  return match ? match[1] : input.replace('@', '').trim()
}

function getAccountType(p: Profile) {
  return p.is_business ? 'Business' : p.is_creator ? 'Creator' : 'Personal'
}

function getAnalysis(followers: number, er: number) {
  if (er > 6) return '🔥 Excellent engagement — great for brand deals'
  if (er > 3) return '✅ Good engagement — suitable for sponsorships'
  if (er > 1) return '⚠️ Average engagement — needs content improvement'
  if (followers > 100000) return '📢 Large audience but low engagement'
  return '📉 Low engagement — build authentic audience first'
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '14px 10px', textAlign: 'center', borderTop: `3px solid ${color}`, boxShadow: '0 1px 6px #0001' }}>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#222' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function toYMD(d: string) {
  if (!d) return ''
  // Unix timestamp (seconds)
  if (/^\d{9,11}$/.test(d.trim())) {
    const dt = new Date(parseInt(d) * 1000)
    return dt.toISOString().slice(0, 10)
  }
  // ISO datetime string e.g. 2024-06-30T10:00:00 or 2024-06-30 10:00:00
  if (d.includes('T') || (d.includes('-') && d.includes(':'))) {
    return d.slice(0, 10)
  }
  // Already YYYY-MM-DD
  if (d.includes('-') && d.indexOf('-') === 4) return d.slice(0, 10)
  // DD-MM-YYYY (e.g. 10-04-2026)
  const h = d.split('-')
  if (h.length === 3 && h[2].length === 4) return `${h[2]}-${h[1].padStart(2, '0')}-${h[0].padStart(2, '0')}`
  // DD/MM/YYYY (e.g. 10/04/2026)
  const p = d.split('/')
  if (p.length === 3) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`
  return d
}

function fmtDisplay(d: string) {
  const y = toYMD(d)
  if (!y) return '—'
  const [yr, m, day] = y.split('-')
  return `${parseInt(day)}-${parseInt(m)}-${yr}`
}

function downloadCSV(rows: any[], filename: string) {
  const header = ['#', 'Date', 'Type', 'Likes', 'Comments', 'Views']
  const lines = [header.join(','), ...rows.map((r, i) => [i + 1, r.date, r.type, r.likes, r.comments, r.views].join(','))]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
}

function DownloadAllBtn({ username }: { username: string }) {
  const [busy, setBusy] = useState(false)
  const [prog, setProg] = useState(0)

  async function handleDownloadAll() {
    if (busy) return
    setBusy(true); setProg(0)
    const iv = setInterval(() => setProg(p => p < 85 ? p + Math.floor(Math.random() * 10) + 3 : p), 500)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/all-posts-reels/${username}`)
      const json = await res.json()
      const raw: MediaItem[] = [...(json.posts ?? []), ...(json.reels ?? [])]
      // Deduplicate: carousel posts share same date+likes+comments — keep only first occurrence
      const seen = new Set<string>()
      const all = raw.filter(item => {
        const key = `${item.date}_${item.likes}_${item.comments}_${item.media_type}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      all.sort((a, b) => toYMD(b.date).localeCompare(toYMD(a.date)))
      clearInterval(iv); setProg(100)
      downloadCSV(all.map(item => ({
        date: fmtDisplay(item.date),
        type: item.media_type === 'reel' ? 'Reel' : 'Image',
        likes: item.likes,
        comments: item.comments,
        views: item.views || 0
      })), `${username}_all_posts.csv`)
    } catch { clearInterval(iv) }
    setTimeout(() => { setBusy(false); setProg(0) }, 600)
  }

  return (
    <button onClick={handleDownloadAll} disabled={busy} title="Download all posts data as Excel"
      style={{ width: 54, height: 54, borderRadius: '50%', border: '2.5px solid #222', background: '#fff', cursor: busy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px #0002', flexShrink: 0 }}>
      {busy ? (
        <svg width="32" height="32" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="14" fill="none" stroke="#eee" strokeWidth="3.5" />
          <circle cx="18" cy="18" r="14" fill="none" stroke="#22c55e" strokeWidth="3.5"
            strokeDasharray={`${(prog / 100) * 87.96} 87.96`} strokeLinecap="round"
            transform="rotate(-90 18 18)" style={{ transition: 'stroke-dasharray 0.35s' }} />
          <text x="18" y="22" textAnchor="middle" fill="#222" fontSize="8" fontWeight="bold">{prog}%</text>
        </svg>
      ) : (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v13M7 11l5 5 5-5" />
          <path d="M5 20h14" />
        </svg>
      )}
    </button>
  )
}

const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#555', background: '#f0f0f0', borderBottom: '2px solid #ddd', whiteSpace: 'nowrap' }
const tdStyle: React.CSSProperties = { padding: '9px 14px', fontSize: 13, borderBottom: '1px solid #f0f0f0' }

type Screen = 'search' | 'profile' | 'analysis'
type DateMode = 'single' | 'range' | 'manual'

export default function App() {
  const [screen, setScreen] = useState<Screen>('search')
  const [input, setInput] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<MediaItem[]>([])
  const [reels, setReels] = useState<MediaItem[]>([])
  const [engagementRate, setEngagementRate] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Date selector state
  const [dateMode, setDateMode] = useState<DateMode>('range')
  const [contentType, setContentType] = useState<'posts' | 'reels'>('posts')
  const [singleDate, setSingleDate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [manualDates, setManualDates] = useState('')

  // Analysis results
  const [analysisData, setAnalysisData] = useState<MediaItem[]>([])
  const [allLoading, setAllLoading] = useState(false)
  const [analysisLabel, setAnalysisLabel] = useState('')
  const [progress, setProgress] = useState(0)
  const [debugInfo, setDebugInfo] = useState('')

  async function handleAnalyze() {
    if (!input.trim()) return
    setLoading(true); setError('')
    const username = extractUsername(input)
    try {
      // Fetch profile + first page only for instant display
      const res = await api.getAnalytics(username)
      const p: Profile = {
        username: res.username ?? username,
        full_name: res.full_name ?? '',
        biography: res.biography ?? '',
        followers: res.followers ?? 0,
        following: res.following ?? 0,
        posts_count: res.posts_count ?? 0,
        is_private: res.is_private ?? false,
        is_business: res.is_business ?? false,
        is_creator: res.is_creator ?? false,
        profile_pic: res.profile_pic ?? '',
        reels_count: res.reels_count ?? 0,
        collab_count: res.collab_count ?? 0,
        avg_likes: res.avg_likes ?? 0,
        avg_comments: res.avg_comments ?? 0,
        avg_reel_views: res.avg_reel_views ?? 0,
        images_count: res.images_count ?? 0,
        videos_in_posts: res.videos_in_posts ?? 0,
      }
      setProfile(p)
      const er = p.followers > 0 ? parseFloat((((p.avg_likes + p.avg_comments) / p.followers) * 100).toFixed(2)) : 0
      setEngagementRate(er)
      setPosts(res.posts ?? [])
      setReels(res.reels ?? [])
      setScreen('profile')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to fetch. Is backend running on port 5000?')
    } finally { setLoading(false) }
  }

  async function handleDateSubmit(freshPosts = posts, freshReels = reels) {
    const allData = [...freshPosts, ...freshReels]

    // Debug: show raw date samples from API
    const sample = allData.slice(0, 5).map(i => `raw="${i.date}" → ymd="${toYMD(i.date)}"`).join(' | ')
    setDebugInfo(`Total fetched: ${allData.length} items. Sample dates: ${sample || 'none'}`)

    let filtered: MediaItem[] = []
    let label = ''

    if (dateMode === 'single') {
      if (!singleDate) return
      filtered = allData.filter(item => toYMD(item.date) === singleDate)
      label = fmtDisplay(singleDate)
    } else if (dateMode === 'range') {
      if (!startDate || !endDate) return
      filtered = allData.filter(item => { const d = toYMD(item.date); return d && d >= startDate && d <= endDate })
      label = `${fmtDisplay(startDate)} → ${fmtDisplay(endDate)}`
    } else {
      const rawDates = manualDates.split(/[,\n]/).map(d => d.trim()).filter(Boolean)
      if (!rawDates.length) return
      const dates = rawDates.map(toYMD)
      filtered = allData.filter(item => dates.includes(toYMD(item.date)))
      label = dates.map(fmtDisplay).join(', ')
    }

    setAnalysisData(filtered)
    setAnalysisLabel(label)
    setScreen('analysis')


  }

  // ── SCREEN 1: Search ──────────────────────────────────────────────
  if (screen === 'search') return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f5f5f5,#ffe4ef)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="search-card">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="ig" cx="30%" cy="107%" r="150%">
                  <stop offset="0%" stopColor="#fdf497"/>
                  <stop offset="5%" stopColor="#fdf497"/>
                  <stop offset="45%" stopColor="#fd5949"/>
                  <stop offset="60%" stopColor="#d6249f"/>
                  <stop offset="90%" stopColor="#285AEB"/>
                </radialGradient>
              </defs>
              <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig)"/>
              <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none"/>
              <circle cx="17.5" cy="6.5" r="1.2" fill="white"/>
            </svg>
          </div>
          <h1 style={{ margin: 0, fontSize: 26, color: '#222' }}>Instagram Analyzer</h1>
          <p style={{ color: '#888', marginTop: 8, fontSize: 14 }}>Enter username, @id, or profile URL</p>
        </div>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
          placeholder="e.g. rohitsharma45 or https://instagram.com/rohitsharma45"
          style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1.5px solid #ddd', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
        <button onClick={handleAnalyze} disabled={loading}
          style={{ width: '100%', padding: '14px', borderRadius: 12, background: '#e1306c', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>
          {loading ? '⏳ Analyzing...' : '🔍 Analyze'}
        </button>
        {error && <p style={{ color: 'red', textAlign: 'center', marginTop: 12, fontSize: 13 }}>{error}</p>}
      </div>
    </div>
  )

  // ── SCREEN 2: Profile ─────────────────────────────────────────────
  if (screen === 'profile' && profile) {
    const imagesCount = posts.length
    const reelsCount = reels.length
    return (
      <div style={{ maxWidth: 820, margin: '0 auto', fontFamily: 'sans-serif', padding: '24px 16px', background: '#f5f5f5', minHeight: '100vh' }}>
        <button onClick={() => setScreen('search')} style={{ marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 14 }}>← Back</button>

        {/* Profile Card */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px #0001', marginBottom: 16 }}>
          <div className="profile-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {profile.profile_pic
                ? <img src={proxyImg(profile.profile_pic)} alt="pic" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #e1306c' }} />
                : <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>👤</div>}
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>@{profile.username}</h2>
                {profile.full_name && <p style={{ margin: '4px 0', color: '#555', fontWeight: 600 }}>{profile.full_name}</p>}
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: 12, background: '#e1306c22', color: '#e1306c', padding: '3px 10px', borderRadius: 20 }}>{getAccountType(profile)}</span>
                  <span style={{ fontSize: 12, background: '#f0f0f0', color: '#555', padding: '3px 10px', borderRadius: 20 }}>{profile.is_private ? '🔒 Private' : '🌐 Public'}</span>
                </div>
              </div>
            </div>
            <DownloadAllBtn username={profile.username} />
          </div>

          <div className="grid-3">
            <StatCard label="👥 Followers" value={fmt(profile.followers)} color="#3897f0" />
            <StatCard label="➡️ Following" value={fmt(profile.following)} color="#888" />
            <StatCard label="📸 Posts" value={fmt(profile.posts_count)} color="#e1306c" />
          </div>
          <div className="grid-3" style={{ marginBottom: 10 }}>
            <StatCard label="📈 Engagement" value={`${engagementRate}%`} sub="rate" color="#10b981" />
            <StatCard label="❤️ Avg Likes" value={fmt(profile.avg_likes)} sub="per post" color="#e1306c" />
            <StatCard label="💬 Avg Comments" value={fmt(profile.avg_comments)} sub="per post" color="#3897f0" />
          </div>
          <div className="grid-3" style={{ marginBottom: 16 }}>
            <StatCard label="👁️ Avg Reel Views" value={fmt(profile.avg_reel_views)} sub="per reel" color="#a855f7" />
          </div>

          <div style={{ background: '#e1306c11', borderLeft: '4px solid #e1306c', padding: '12px 16px', borderRadius: 8, fontSize: 14 }}>
            <strong>Business Analysis:</strong> {getAnalysis(profile.followers, engagementRate)}
          </div>
        </div>

        {/* Date Selector Panel - no Posts/Reels toggle */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px #0001', marginTop: 16 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 17 }}>📅 Select Dates</h3>
          {debugInfo && (
            <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#7c5e00', marginBottom: 12, wordBreak: 'break-all' }}>
              🔍 {debugInfo}
            </div>
          )}
          <div className="date-tabs" style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1.5px solid #ddd' }}>
            {(['single', 'range', 'manual'] as DateMode[]).map(m => (
              <button key={m} onClick={() => setDateMode(m)}
                style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                  background: dateMode === m ? '#3897f0' : '#fff', color: dateMode === m ? '#fff' : '#555',
                  borderRight: m !== 'manual' ? '1px solid #ddd' : 'none' }}>
                {m === 'single' ? '📆 Single' : m === 'range' ? '📅 Date Range' : '✏️ Manual Input'}
              </button>
            ))}
          </div>
          {dateMode === 'single' && (
            <input type="date" value={singleDate} onChange={e => setSingleDate(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 14, width: '100%', boxSizing: 'border-box', marginBottom: 16 }} />
          )}
          {dateMode === 'range' && (
            <div className="grid-2">
              <div>
                <p style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>Start Date</p>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <p style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>End Date</p>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 14, width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>
          )}
          {dateMode === 'manual' && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>Enter dates — DD/MM/YYYY or DD-MM-YYYY, comma or newline separated</p>
              <textarea value={manualDates} onChange={e => setManualDates(e.target.value)}
                placeholder="e.g. 01/04/2026, 02/04/2026 or 01-04-2026, 02-04-2026"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 14, boxSizing: 'border-box', minHeight: 80, resize: 'vertical' }} />
            </div>
          )}
          <button onClick={async () => {
            setAllLoading(true)
            setProgress(0)
            let freshPosts = posts, freshReels = reels
            const interval = setInterval(() => {
              setProgress(p => p < 92 ? p + Math.floor(Math.random() * 8) + 2 : p)
            }, 600)
            try {
              const controller = new AbortController()
              const timeout = setTimeout(() => controller.abort(), 900000)
              const res = await fetch(`${import.meta.env.VITE_API_BASE}/all-posts-reels/${profile.username}`, { signal: controller.signal })
              clearTimeout(timeout)
              const json = await res.json()
              if (json.posts) { freshPosts = json.posts; setPosts(json.posts) }
              if (json.reels) { freshReels = json.reels; setReels(json.reels) }
            } catch (e) { console.error('fetch failed', e) }
            clearInterval(interval)
            setProgress(100)
            setTimeout(() => { setAllLoading(false); setProgress(0); handleDateSubmit(freshPosts, freshReels) }, 400)
          }} disabled={allLoading} style={{ width: '100%', padding: '13px', borderRadius: 10, background: allLoading ? '#1a5c38' : '#217346', color: '#fff', border: 'none', cursor: allLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            {allLoading ? (
              <>
                <svg width="28" height="28" viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#fff" strokeWidth="3.5"
                    strokeDasharray={`${(progress / 100) * 94.2} 94.2`}
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                    style={{ transition: 'stroke-dasharray 0.35s ease' }} />
                  <text x="18" y="22" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">{progress}%</text>
                </svg>
                Analyzing...
              </>
            ) : '📊 Submit & Generate Analysis'}
          </button>
        </div>
      </div>
    )
  }

  // ── SCREEN 3: Analysis Results ────────────────────────────────────
  if (screen === 'analysis') {
    const totalLikes = analysisData.reduce((s, i) => s + i.likes, 0)
    const totalComments = analysisData.reduce((s, i) => s + i.comments, 0)
    const totalViews = analysisData.reduce((s, i) => s + (i.views || 0), 0)

    return (
      <div style={{ maxWidth: 820, margin: '0 auto', fontFamily: 'sans-serif', padding: '24px 16px', background: '#f5f5f5', minHeight: '100vh' }}>
        <button onClick={() => setScreen('profile')} style={{ marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 14 }}>← Back to Profile</button>

        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px #0001' }}>
          <div className="analysis-header">
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>📊 Analysis Dashboard</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#888' }}>
                @{profile?.username} · {contentType === 'posts' ? '📸 Posts' : '🎬 Reels'} · {analysisLabel}
              </p>
            </div>
            <button onClick={() => downloadCSV(analysisData.map(item => ({ date: fmtDisplay(item.date), type: item.media_type === 'reel' ? 'Reel' : contentType === 'reels' ? 'Reel' : 'Image', likes: item.likes, comments: item.comments, views: item.views || 0 })), `${profile?.username}_${contentType}_analysis.csv`)}
              style={{ padding: '10px 20px', borderRadius: 8, background: '#217346', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              📥 Download Excel
            </button>
          </div>

          {analysisData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ color: '#aaa', fontSize: 15 }}>No {contentType} found for selected date(s)</p>
              <button onClick={() => setScreen('profile')} style={{ marginTop: 12, padding: '10px 24px', borderRadius: 8, background: '#e1306c', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                ← Change Date
              </button>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid-stats">
                <StatCard label="📊 Total Items" value={analysisData.length.toString()} color="#3897f0" />
                <StatCard label="❤️ Total Likes" value={fmt(totalLikes)} color="#e1306c" />
                <StatCard label="💬 Total Comments" value={fmt(totalComments)} color="#f59e0b" />
                <StatCard label="👁️ Total Views" value={fmt(totalViews)} color="#a855f7" />
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>📅 Date</th>
                      <th style={thStyle}>📝 Post / Reels</th>
                      <th style={thStyle}>❤️ Likes</th>
                      <th style={thStyle}>💬 Comments</th>
                      <th style={thStyle}>👁️ Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisData.map((item, i) => (
                      <tr key={item.id || i} style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}>
                        <td style={tdStyle}>{i + 1}</td>
                        <td style={tdStyle}>{fmtDisplay(item.date)}</td>
                        <td style={tdStyle}>{item.media_type === 'reel' ? '🎬 Reel' : contentType === 'reels' ? '🎬 Reel' : '🖼️ Image'}</td>
                        <td style={{ ...tdStyle, fontWeight: 600, color: '#e1306c' }}>{fmt(item.likes)}</td>
                        <td style={{ ...tdStyle, fontWeight: 600, color: '#f59e0b' }}>{fmt(item.comments)}</td>
                        <td style={{ ...tdStyle, fontWeight: 600, color: '#a855f7' }}>{fmt(item.views || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return null
}
