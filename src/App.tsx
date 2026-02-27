import { useEffect, useState } from 'react'
import './App.css'
import { FileUpload } from './components/FileUpload'
import { LogConsole } from './components/LogConsole'
import { AboutPage } from './components/AboutPage'
import { PlasmidResults } from './components/PlasmidResults'
import { OptionsPanel } from './components/OptionsPanel'
import { runTipToftX } from './tiptoftx/pipeline'
import { DEFAULT_OPTIONS } from './tiptoftx/types'
import type { TipToftXOptions, TipToftXResult } from './tiptoftx/types'

type View = 'analysis' | 'about'

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem('gx-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const [files, setFiles] = useState<File[]>([])
  const [options, setOptions] = useState<TipToftXOptions>(DEFAULT_OPTIONS)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState('')
  const [progressPct, setProgressPct] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [logLines, setLogLines] = useState<string[]>([])
  const [result, setResult] = useState<TipToftXResult | null>(null)
  const [dbText, setDbText] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)
  const [currentView, setCurrentView] = useState<View>('analysis')

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('gx-theme', theme)
  }, [theme])

  // Load plasmid database on mount
  useEffect(() => {
    fetch('/db/plasmid_data.fa')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load database: ${r.status} ${r.statusText}`)
        return r.text()
      })
      .then(setDbText)
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e)
        setError(`Database load error: ${msg}`)
      })
  }, [])

  function toggleTheme() {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  }

  async function handleRun() {
    if (!dbText) {
      setError('Database not loaded yet. Please wait.')
      return
    }
    if (files.length === 0) {
      setError('Please select at least one FASTQ file.')
      return
    }

    setRunning(true)
    setError(null)
    setResult(null)
    setLogLines([])
    setProgress('Starting…')
    setProgressPct(0)

    try {
      const res = await runTipToftX(
        files,
        dbText,
        options,
        (msg: string, pct: number) => {
          setProgress(msg)
          setProgressPct(pct)
        },
        (msg: string) => {
          setLogLines((prev) => [...prev, msg])
        },
      )
      setResult(res)
      setProgress('Done')
      setProgressPct(100)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setRunning(false)
    }
  }

  const canRun = !running && dbText !== null && files.length > 0

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-top">
          <div>
            <h1>TipToftX</h1>
            <div className="subtitle">Plasmid replicon detection from long reads</div>
          </div>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            type="button"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '\u2600' : '\u263E'}
          </button>
        </div>

        {/* Tab bar */}
        <nav className="tab-bar" aria-label="Main navigation">
          <button
            className={`tab${currentView === 'analysis' ? ' tab-active' : ''}`}
            onClick={() => setCurrentView('analysis')}
            type="button"
          >
            Analysis
          </button>
          <button
            className={`tab${currentView === 'about' ? ' tab-active' : ''}`}
            onClick={() => setCurrentView('about')}
            type="button"
          >
            About
          </button>
        </nav>
      </header>

      {/* Main content */}
      <main className="app-main">
        {currentView === 'about' ? (
          <AboutPage />
        ) : (
          <>
            {/* Controls grid */}
            <div className="controls">
              <FileUpload
                files={files}
                onFilesChange={setFiles}
                disabled={running}
              />
              <OptionsPanel
                options={options}
                onChange={setOptions}
                disabled={running}
              />
            </div>

            {/* Run section */}
            <div className="run-section">
              <button
                className="run-button"
                type="button"
                onClick={() => { void handleRun() }}
                disabled={!canRun}
              >
                {running ? 'Running…' : 'Run Analysis'}
              </button>
              {!dbText && !error && (
                <span style={{ fontSize: '0.875rem', color: 'var(--gx-text-muted)' }}>
                  Loading database…
                </span>
              )}
            </div>

            {/* Error */}
            {error && <div className="error">{error}</div>}

            {/* Progress */}
            {running && (
              <div className="progress">
                <p>{progress}</p>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Results */}
            {result && <PlasmidResults result={result} />}

            {/* Log console */}
            <LogConsole lines={logLines} />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-inner">
          <span>TipToftX &mdash; GenomicX</span>
          <div className="footer-links">
            <a
              href="https://doi.org/10.21105/joss.01021"
              target="_blank"
              rel="noopener noreferrer"
            >
              Citation
            </a>
            <a
              href="https://github.com/quadram-institute-bioscience"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
