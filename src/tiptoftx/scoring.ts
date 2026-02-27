/**
 * Gene scoring and hit filtering.
 *
 * TypeScript reimplementation of tiptoft/Fastq.py scoring logic (full_gene_coverage,
 * filter_contained_alleles) and Gene.__str__ output logic.
 */

import { GeneScore, type PlasmidHit } from './types'
import type { DatabaseIndex } from './types'

/**
 * Build GeneScore objects from the accumulated k-mer coverage data.
 * For each gene in the index, count k-mers with coverage > 0 vs == 0.
 * Only return genes where kmersWithCoverage > kmersWithoutCoverage.
 */
export function buildGeneScores(db: DatabaseIndex): GeneScore[] {
  const scores: GeneScore[] = []

  for (const [geneName, kmersDict] of db.sequencesToKmers) {
    const kv = Array.from(kmersDict.values())
    const totalLength = kv.length
    const withoutCoverage = kv.filter(x => x === 0).length
    const withCoverage = totalLength - withoutCoverage

    if (withCoverage > withoutCoverage) {
      scores.push(new GeneScore(geneName, withCoverage, withoutCoverage))
    }
  }

  return scores
}

/**
 * Filter genes by minimum percentage coverage threshold.
 */
export function filterByMinCoverage(
  genes: GeneScore[],
  minPctCoverage: number,
): GeneScore[] {
  return genes.filter(g => g.percentageCoverage() >= minPctCoverage)
}

/**
 * Filter contained alleles: for each replicon family (prefix_short_name),
 * keep only the highest-coverage allele, UNLESS it has 100% coverage
 * (in which case keep all 100% alleles).
 * Mirrors Python filter_contained_alleles().
 */
export function filterContainedAlleles(
  genes: GeneScore[],
  noGeneFilter: boolean,
): GeneScore[] {
  if (noGeneFilter) {
    return genes
  }

  // Group genes by prefix_short_name
  const prefixToGenes = new Map<string, GeneScore[]>()
  for (const g of genes) {
    const prefix = g.prefixShortName()
    const group = prefixToGenes.get(prefix)
    if (group !== undefined) {
      group.push(g)
    } else {
      prefixToGenes.set(prefix, [g])
    }
  }

  const filtered: GeneScore[] = []
  for (const group of prefixToGenes.values()) {
    // Sort descending by percentage coverage
    group.sort((a, b) => b.percentageCoverage() - a.percentageCoverage())

    for (let index = 0; index < group.length; index++) {
      const gene = group[index]
      // Keep if 100% coverage OR if it is the first (highest coverage) in the group
      if (gene.percentageCoverage() === 100 || index === 0) {
        filtered.push(gene)
      }
    }
  }

  return filtered
}

/**
 * Convert GeneScore to PlasmidHit.
 * Extracts incGroup from the gene short name if it matches Inc[A-Z]+ pattern.
 */
export function toPlasmidHit(gene: GeneScore): PlasmidHit {
  const shortName = gene.shortName()
  const incGroupMatch = shortName.match(/Inc[A-Za-z0-9]+/)
  const incGroup = incGroupMatch ? incGroupMatch[0] : null

  return {
    gene: shortName,
    completeness: gene.completeness(),
    percentCoverage: gene.percentageCoverage(),
    accession: gene.accession(),
    database: 'plasmidfinder',
    product: gene.name,
    incGroup,
  }
}
