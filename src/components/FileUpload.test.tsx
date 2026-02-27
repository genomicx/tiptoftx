import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FileUpload } from './FileUpload'

describe('FileUpload', () => {
  it('renders the upload drop zone', () => {
    render(<FileUpload files={[]} onFilesChange={() => undefined} disabled={false} />)
    expect(screen.getByRole('button', { name: 'Upload FASTQ files' })).toBeDefined()
  })

  it('shows a prompt to click or drag files', () => {
    render(<FileUpload files={[]} onFilesChange={() => undefined} disabled={false} />)
    expect(screen.getByText(/Click or drag/i)).toBeDefined()
  })

  it('lists accepted extensions', () => {
    render(<FileUpload files={[]} onFilesChange={() => undefined} disabled={false} />)
    expect(screen.getByText(/\.fastq.*\.fq/)).toBeDefined()
  })

  it('shows no file list when no files have been selected', () => {
    render(<FileUpload files={[]} onFilesChange={() => undefined} disabled={false} />)
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('renders file names when files are provided', () => {
    const files = [new File(['data'], 'sample.fastq')]
    render(<FileUpload files={files} onFilesChange={() => undefined} disabled={false} />)
    expect(screen.getByText(/sample\.fastq/)).toBeDefined()
  })

  it('shows remove buttons for each file when not disabled', () => {
    const files = [
      new File(['data'], 'a.fastq'),
      new File(['data'], 'b.fastq'),
    ]
    render(<FileUpload files={files} onFilesChange={() => undefined} disabled={false} />)
    expect(screen.getAllByRole('button', { name: /Remove/ })).toHaveLength(2)
  })

  it('hides remove buttons when disabled', () => {
    const files = [new File(['data'], 'sample.fastq')]
    render(<FileUpload files={files} onFilesChange={() => undefined} disabled={true} />)
    expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull()
  })

  it('calls onFilesChange with remaining files after removal', () => {
    const files = [
      new File(['data'], 'keep.fastq'),
      new File(['data'], 'remove.fastq'),
    ]
    const onFilesChange = vi.fn()
    render(<FileUpload files={files} onFilesChange={onFilesChange} disabled={false} />)
    screen.getByRole('button', { name: /Remove remove\.fastq/ }).click()
    expect(onFilesChange).toHaveBeenCalledOnce()
    const updated: File[] = onFilesChange.mock.calls[0][0] as File[]
    expect(updated).toHaveLength(1)
    expect(updated[0].name).toBe('keep.fastq')
  })

  it('applies disabled class when disabled', () => {
    const { container } = render(
      <FileUpload files={[]} onFilesChange={() => undefined} disabled={true} />,
    )
    expect(container.querySelector('.disabled')).not.toBeNull()
  })
})
