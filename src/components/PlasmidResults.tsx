import type { TipToftXResult } from '../tiptoftx/types'

interface PlasmidResultsProps {
  result: TipToftXResult
}

function exportTsv(result: TipToftXResult) {
  const header = 'Gene\tCompleteness\t%Coverage\tAccession\tDatabase\tProduct'
  const rows = result.hits.map((h) =>
    [
      h.gene,
      h.completeness,
      h.percentCoverage.toString(),
      h.accession,
      h.database,
      h.product,
    ].join('\t'),
  )
  const content = [header, ...rows].join('\n')
  const blob = new Blob([content], { type: 'text/tab-separated-values' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'tiptoftx_results.tsv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function PlasmidResults({ result }: PlasmidResultsProps) {
  const fullMatches = result.hits.filter((h) => h.completeness === 'Full').length

  return (
    <div className="results">
      {/* Summary cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-value">{result.hits.length}</div>
          <div className="summary-card-label">
            plasmid type{result.hits.length !== 1 ? 's' : ''} detected
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-value">{fullMatches}</div>
          <div className="summary-card-label">
            full match{fullMatches !== 1 ? 'es' : ''}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-value">
            {result.totalReadsProcessed.toLocaleString()}
          </div>
          <div className="summary-card-label">reads processed</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-value">
            {(result.processingTimeMs / 1000).toFixed(1)}s
          </div>
          <div className="summary-card-label">processing time</div>
        </div>
      </div>

      {/* Results header */}
      <div className="results-header">
        <h2>Plasmid Replicons</h2>
        {result.hits.length > 0 && (
          <button
            className="export-button"
            type="button"
            onClick={() => exportTsv(result)}
          >
            Export TSV
          </button>
        )}
      </div>

      {result.hits.length === 0 ? (
        <div className="empty-state">
          <p>No plasmid replicons detected</p>
          <small>
            No replicon sequences passed the coverage threshold. Try lowering the minimum
            coverage or check that the input reads are long-read data.
          </small>
        </div>
      ) : (
        <div className="results-table-wrapper">
          <table className="results-table">
            <thead>
              <tr>
                <th>Gene</th>
                <th>Completeness</th>
                <th>Coverage</th>
                <th>Accession</th>
                <th>Product</th>
                <th>Inc Group</th>
              </tr>
            </thead>
            <tbody>
              {result.hits.map((hit, i) => (
                <tr key={i}>
                  <td>
                    <code style={{ fontSize: '0.8125rem' }}>{hit.gene}</code>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        hit.completeness === 'Full' ? 'badge-full' : 'badge-partial'
                      }`}
                    >
                      {hit.completeness}
                    </span>
                  </td>
                  <td>
                    <div className="coverage-bar-container">
                      <div className="coverage-bar-track">
                        <div
                          className="coverage-bar-fill"
                          style={{ width: `${hit.percentCoverage}%` }}
                        />
                      </div>
                      <span className="coverage-bar-pct">{hit.percentCoverage}%</span>
                    </div>
                  </td>
                  <td>
                    {hit.accession ? (
                      <a
                        href={`https://www.ncbi.nlm.nih.gov/nuccore/${hit.accession}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {hit.accession}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--gx-text-muted)' }}>-</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--gx-text-muted)', fontSize: '0.8125rem' }}>
                    {hit.product || '-'}
                  </td>
                  <td>
                    {hit.incGroup ? (
                      <span className="badge inc-badge">{hit.incGroup}</span>
                    ) : (
                      <span style={{ color: 'var(--gx-text-muted)' }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
