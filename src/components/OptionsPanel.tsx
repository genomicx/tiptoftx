import type { TipToftXOptions } from '../tiptoftx/types'

interface OptionsPanelProps {
  options: TipToftXOptions
  onChange: (opts: TipToftXOptions) => void
  disabled: boolean
}

export function OptionsPanel({ options, onChange, disabled }: OptionsPanelProps) {
  function update<K extends keyof TipToftXOptions>(key: K, value: TipToftXOptions[K]) {
    onChange({ ...options, [key]: value })
  }

  return (
    <div className="options-panel">
      <h3>Options</h3>

      {/* K-mer size */}
      <div className="options-row">
        <label className="options-label" htmlFor="kmerSize">
          K-mer size
        </label>
        <input
          id="kmerSize"
          type="number"
          min={7}
          max={31}
          value={options.kmerSize}
          disabled={disabled}
          onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) update('kmerSize', v) }}
        />
      </div>

      {/* Min % coverage */}
      <div className="options-row">
        <label className="options-label" htmlFor="minPctCoverage">
          Min % coverage
        </label>
        <input
          id="minPctCoverage"
          type="range"
          min={50}
          max={100}
          step={1}
          value={options.minPctCoverage}
          disabled={disabled}
          onChange={(e) => update('minPctCoverage', parseInt(e.target.value, 10))}
          style={{ width: '8rem' }}
        />
        <span className="options-range-value">{options.minPctCoverage}%</span>
      </div>

      {/* Homopolymer compression */}
      <div className="options-row">
        <label className="options-label" htmlFor="useHCCompression">
          Homopolymer compression
        </label>
        <input
          id="useHCCompression"
          type="checkbox"
          checked={options.useHCCompression}
          disabled={disabled}
          onChange={(e) => update('useHCCompression', e.target.checked)}
        />
      </div>

      {/* Advanced section */}
      <details className="options-advanced">
        <summary>Advanced</summary>
        <div className="advanced-body">
          {/* Max gap */}
          <div className="options-row">
            <label className="options-label" htmlFor="maxGap">
              Max gap
            </label>
            <input
              id="maxGap"
              type="number"
              min={1}
              max={20}
              value={options.maxGap}
              disabled={disabled}
              onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) update('maxGap', v) }}
            />
          </div>

          {/* Min block size */}
          <div className="options-row">
            <label className="options-label" htmlFor="minBlockSize">
              Min block size
            </label>
            <input
              id="minBlockSize"
              type="number"
              min={10}
              max={500}
              value={options.minBlockSize}
              disabled={disabled}
              onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) update('minBlockSize', v) }}
            />
          </div>
        </div>
      </details>
    </div>
  )
}
