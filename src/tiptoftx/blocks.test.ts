import { describe, expect, it } from 'vitest'
import {
  findBlocks,
  mergeBlocks,
  selectLargestBlock,
  adjustBlockStart,
  adjustBlockEnd,
} from './blocks'

describe('findBlocks', () => {
  it('finds two separate blocks', () => {
    const blocks = findBlocks([0, 1, 1, 0, 0, 1, 0])
    expect(blocks).toEqual([
      { start: 1, end: 3 },
      { start: 5, end: 6 },
    ])
  })

  it('returns empty array for all-zero input', () => {
    expect(findBlocks([0, 0, 0])).toEqual([])
  })

  it('returns empty array for empty input', () => {
    expect(findBlocks([])).toEqual([])
  })

  it('handles a block that reaches the end of the array', () => {
    expect(findBlocks([0, 1, 1])).toEqual([{ start: 1, end: 3 }])
  })

  it('handles a single full-coverage block', () => {
    expect(findBlocks([2, 3, 1])).toEqual([{ start: 0, end: 3 }])
  })
})

describe('mergeBlocks', () => {
  it('merges adjacent blocks when gap <= maxGap', () => {
    // blocks [0,3] and [5,8]: gap = 5 - 3 = 2; maxGap=3 → 3+3=6 > 5 → merge
    const merged = mergeBlocks([{ start: 0, end: 3 }, { start: 5, end: 8 }], 3)
    const last = merged[merged.length - 1]
    expect(last.start).toBe(0)
    expect(last.end).toBe(8)
  })

  it('does not merge blocks beyond maxGap', () => {
    // blocks [0,3] and [10,13]: gap = 10 - 3 = 7; maxGap=3 → 3+3=6 < 10 → no merge
    const merged = mergeBlocks([{ start: 0, end: 3 }, { start: 10, end: 13 }], 3)
    expect(merged[merged.length - 1].start).toBe(10)
    expect(merged[merged.length - 1].end).toBe(13)
  })

  it('returns empty array for empty input', () => {
    expect(mergeBlocks([], 3)).toEqual([])
  })

  it('returns single-element array unchanged', () => {
    const result = mergeBlocks([{ start: 2, end: 5 }], 3)
    expect(result).toEqual([{ start: 2, end: 5 }])
  })

  it('chains three blocks together when all gaps fit', () => {
    // [0,3] → [5,8]: gap=2 ≤ 3 → merge → [0,8]
    // [0,8] (now [1]) → [10,13]: gap=2 ≤ 3 → merge → [0,13]
    const blocks = [
      { start: 0, end: 3 },
      { start: 5, end: 8 },
      { start: 10, end: 13 },
    ]
    const merged = mergeBlocks(blocks, 3)
    const last = merged[merged.length - 1]
    expect(last.start).toBe(0)
    expect(last.end).toBe(13)
  })
})

describe('selectLargestBlock', () => {
  it('selects the larger of two blocks', () => {
    // hits: block [0,3) size 3 and block [6,8) size 2 → largest is [0,3)
    const hits = [1, 1, 1, 0, 0, 0, 1, 1, 0, 0]
    const block = selectLargestBlock(hits, 1, 1, 0)
    expect(block).not.toBeNull()
    expect(block!.end - block!.start).toBe(3)
  })

  it('returns null for empty hits array', () => {
    expect(selectLargestBlock([], 1, 1, 1)).toBeNull()
  })

  it('returns null when largest block does not meet minBlockSize', () => {
    // block size = 1 bin; minBlockSize/k = 100/13 ≈ 7.7 → 1 < 7.7 → null
    expect(selectLargestBlock([1, 0, 0, 0], 13, 100, 3)).toBeNull()
  })

  it('merges nearby blocks before selecting', () => {
    // raw blocks: [{start:0,end:2},{start:3,end:5}]
    // with maxGap=2: 2+2=4 > 3 → merged to {start:0,end:5}
    const hits = [1, 1, 0, 1, 1, 0, 0, 0]
    const block = selectLargestBlock(hits, 1, 1, 2)
    expect(block).not.toBeNull()
    expect(block!.start).toBe(0)
    expect(block!.end).toBe(5)
  })
})

describe('adjustBlockStart', () => {
  it('subtracts margin from block start in bases', () => {
    expect(adjustBlockStart(5, 13, 10)).toBe(55) // 5*13 - 10 = 55
  })

  it('clamps to zero when margin extends before start', () => {
    expect(adjustBlockStart(0, 13, 10)).toBe(0) // 0 - 10 < 0 → 0
  })
})

describe('adjustBlockEnd', () => {
  it('adds margin to block end in bases', () => {
    expect(adjustBlockEnd(5, 13, 10, 1000)).toBe(75) // 5*13 + 10 = 75
  })

  it('clamps to seqLength when margin extends beyond end', () => {
    expect(adjustBlockEnd(5, 13, 10, 60)).toBe(60) // 75 > 60 → 60
  })
})
