import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlasmidResults } from './PlasmidResults'
import type { TipToftXResult } from '../tiptoftx/types'

const MOCK_RESULT: TipToftXResult = {
  hits: [
    {
      gene: 'rep7.1',
      completeness: 'Full',
      percentCoverage: 100,
      accession: 'KY753453',
      database: 'plasmidfinder',
      product: 'repA (ColE1-type)',
      incGroup: null,
    },
    {
      gene: 'IncFIA',
      completeness: 'Partial',
      percentCoverage: 72,
      accession: 'X54268',
      database: 'plasmidfinder',
      product: 'IncFIA replicon',
      incGroup: 'IncFIA',
    },
  ],
  totalReadsProcessed: 500,
  readsWithMatches: 25,
  processingTimeMs: 1200,
}

const EMPTY_RESULT: TipToftXResult = {
  hits: [],
  totalReadsProcessed: 100,
  readsWithMatches: 0,
  processingTimeMs: 500,
}

describe('PlasmidResults', () => {
  describe('summary cards', () => {
    it('shows the total number of hits', () => {
      render(<PlasmidResults result={MOCK_RESULT} />)
      expect(screen.getByText(/plasmid types detected/)).toBeDefined()
    })

    it('shows the number of full matches', () => {
      render(<PlasmidResults result={MOCK_RESULT} />)
      expect(screen.getByText(/full match/)).toBeDefined()
    })

    it('shows reads processed', () => {
      render(<PlasmidResults result={MOCK_RESULT} />)
      expect(screen.getByText(/reads processed/)).toBeDefined()
    })

    it('shows processing time', () => {
      render(<PlasmidResults result={MOCK_RESULT} />)
      expect(screen.getByText(/processing time/)).toBeDefined()
    })
  })

  describe('results table', () => {
    it('renders gene names for each hit', () => {
      render(<PlasmidResults result={MOCK_RESULT} />)
      expect(screen.getByText('rep7.1')).toBeDefined()
      // IncFIA appears in both the gene code cell and the inc-badge, so use getAllByText
      expect(screen.getAllByText('IncFIA').length).toBeGreaterThan(0)
    })

    it('shows a Full badge for full-coverage hits', () => {
      render(<PlasmidResults result={MOCK_RESULT} />)
      expect(screen.getByText('Full')).toBeDefined()
    })

    it('shows a Partial badge for partial-coverage hits', () => {
      render(<PlasmidResults result={MOCK_RESULT} />)
      expect(screen.getByText('Partial')).toBeDefined()
    })

    it('renders coverage percentages', () => {
      render(<PlasmidResults result={MOCK_RESULT} />)
      expect(screen.getByText('100%')).toBeDefined()
      expect(screen.getByText('72%')).toBeDefined()
    })

    it('links accession numbers to NCBI nuccore', () => {
      render(<PlasmidResults result={MOCK_RESULT} />)
      const link = screen.getByRole('link', { name: 'KY753453' })
      expect((link as HTMLAnchorElement).href).toContain('KY753453')
    })

    it('renders product descriptions', () => {
      render(<PlasmidResults result={MOCK_RESULT} />)
      expect(screen.getByText('repA (ColE1-type)')).toBeDefined()
    })

    it('shows Inc group badges when present', () => {
      render(<PlasmidResults result={MOCK_RESULT} />)
      // IncFIA appears as both gene name (in code element) and inc group badge
      const elements = screen.getAllByText('IncFIA')
      expect(elements.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('export button', () => {
    it('renders the Export TSV button when hits are present', () => {
      render(<PlasmidResults result={MOCK_RESULT} />)
      expect(screen.getByRole('button', { name: 'Export TSV' })).toBeDefined()
    })

    it('does not render the Export TSV button when there are no hits', () => {
      render(<PlasmidResults result={EMPTY_RESULT} />)
      expect(screen.queryByRole('button', { name: 'Export TSV' })).toBeNull()
    })
  })

  describe('empty state', () => {
    it('shows the empty-state message when no hits are returned', () => {
      render(<PlasmidResults result={EMPTY_RESULT} />)
      expect(screen.getByText(/No plasmid replicons detected/)).toBeDefined()
    })

    it('does not render the results table when no hits are returned', () => {
      const { container } = render(<PlasmidResults result={EMPTY_RESULT} />)
      expect(container.querySelector('.results-table')).toBeNull()
    })
  })
})
