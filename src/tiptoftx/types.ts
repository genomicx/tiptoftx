export interface TipToftXOptions {
  kmerSize: number
  minPctCoverage: number
  maxGap: number
  maxKmerCount: number
  minBlockSize: number
  margin: number
  minKmersOnex: number
  minFastaHits: number
  useHCCompression: boolean
  noGeneFilter: boolean
}

export const DEFAULT_OPTIONS: TipToftXOptions = {
  kmerSize: 13,
  minPctCoverage: 85,
  maxGap: 3,
  maxKmerCount: 10,
  minBlockSize: 50,
  margin: 10,
  minKmersOnex: 5,
  minFastaHits: 8,
  useHCCompression: true,
  noGeneFilter: false,
}

export interface FastqRead {
  id: string
  seq: string
}

export interface Block {
  start: number
  end: number
}

export class GeneScore {
  readonly name: string
  kmersWithCoverage: number
  kmersWithoutCoverage: number

  constructor(name: string, kmersWithCoverage: number, kmersWithoutCoverage: number) {
    this.name = name
    this.kmersWithCoverage = kmersWithCoverage
    this.kmersWithoutCoverage = kmersWithoutCoverage
  }

  shortName(): string {
    const m = this.name.match(/^([^_]+)_/)
    return m ? m[1] : ''
  }

  prefixShortName(): string {
    const m = this.shortName().match(/^([^.]+)\./)
    return m ? m[1] : ''
  }

  accession(): string {
    const m = this.name.match(/^([^_]+)_([^_]*)_(.+)$/)
    return m ? m[3] : ''
  }

  percentageCoverage(): number {
    const total = this.kmersWithCoverage + this.kmersWithoutCoverage
    if (total === 0) return 0
    return Math.floor((this.kmersWithCoverage * 100) / total)
  }

  completeness(): 'Full' | 'Partial' {
    return this.kmersWithoutCoverage === 0 ? 'Full' : 'Partial'
  }
}

export interface PlasmidHit {
  gene: string
  completeness: 'Full' | 'Partial'
  percentCoverage: number
  accession: string
  database: string
  product: string
  incGroup: string | null
}

export interface DatabaseIndex {
  kmersToGenes: Map<string, string[]>
  geneToKmers: Map<string, Set<string>>
  allKmersSet: Set<string>
  sequencesToKmers: Map<string, Map<string, number>>
  sequencesToKmersCount: Map<string, Map<string, number>>
}

export interface TipToftXResult {
  hits: PlasmidHit[]
  totalReadsProcessed: number
  readsWithMatches: number
  processingTimeMs: number
}
