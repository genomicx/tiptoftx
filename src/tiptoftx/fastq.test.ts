import { describe, expect, it } from 'vitest'
import { parseFastqFile } from './fastq'

function makeFile(name: string, content: string): File {
  return new File([content], name)
}

async function collectReads(file: File): Promise<Array<{ id: string; seq: string }>> {
  const reads: Array<{ id: string; seq: string }> = []
  for await (const read of parseFastqFile(file)) {
    reads.push(read)
  }
  return reads
}

describe('parseFastqFile', () => {
  it('parses a minimal FASTQ file with one read', async () => {
    const content = '@read1\nACGTACGT\n+\n!!!!!!!!\n'
    const reads = await collectReads(makeFile('test.fastq', content))
    expect(reads).toHaveLength(1)
    expect(reads[0]).toEqual({ id: 'read1', seq: 'ACGTACGT' })
  })

  it('parses multiple reads', async () => {
    const content = '@r1\nAAAA\n+\n!!!!\n@r2\nCCCC\n+\n!!!!\n@r3\nGGGG\n+\n!!!!\n'
    const reads = await collectReads(makeFile('test.fastq', content))
    expect(reads).toHaveLength(3)
    expect(reads[0].id).toBe('r1')
    expect(reads[1].seq).toBe('CCCC')
    expect(reads[2].id).toBe('r3')
  })

  it('strips the leading @ from read IDs', async () => {
    const content = '@my_read_001\nACGT\n+\n!!!!\n'
    const reads = await collectReads(makeFile('test.fastq', content))
    expect(reads[0].id).toBe('my_read_001')
  })

  it('handles Windows CRLF line endings', async () => {
    const content = '@read1\r\nACGT\r\n+\r\n!!!!\r\n'
    const reads = await collectReads(makeFile('test.fastq', content))
    expect(reads).toHaveLength(1)
    expect(reads[0].seq).toBe('ACGT')
  })

  it('yields no reads for an empty file', async () => {
    const reads = await collectReads(makeFile('empty.fastq', ''))
    expect(reads).toHaveLength(0)
  })

  it('yields no reads for non-FASTQ content', async () => {
    const content = 'this is not a fastq file\njust some random text\n'
    const reads = await collectReads(makeFile('other.fastq', content))
    expect(reads).toHaveLength(0)
  })

  it('skips records whose ID line does not start with @', async () => {
    // Two valid records separated by a malformed one (no @)
    const content = '@r1\nAAAA\n+\n!!!!\nbadline\nCCCC\n+\n!!!!\n@r2\nGGGG\n+\n!!!!\n'
    const reads = await collectReads(makeFile('test.fastq', content))
    // Only r1 and r2 are valid (badline record lacks @)
    const ids = reads.map(r => r.id)
    expect(ids).toContain('r1')
    expect(ids).toContain('r2')
  })

  it('correctly parses a read without a trailing newline', async () => {
    const content = '@read1\nACGT\n+\n!!!!'  // no trailing newline
    const reads = await collectReads(makeFile('test.fastq', content))
    expect(reads).toHaveLength(1)
    expect(reads[0].seq).toBe('ACGT')
  })
})
