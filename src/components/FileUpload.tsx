import { useRef, useState } from 'react'

interface FileUploadProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  disabled: boolean
}

function isAccepted(file: File): boolean {
  const name = file.name.endsWith('.gz') ? file.name.slice(0, -3) : file.name
  return name.endsWith('.fastq') || name.endsWith('.fq')
}

export function FileUpload({ files, onFilesChange, disabled }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleFiles(incoming: FileList | null) {
    if (!incoming) return
    const accepted = Array.from(incoming).filter(isAccepted)
    if (accepted.length > 0) {
      onFilesChange([...files, ...accepted])
    }
  }

  function handleClick() {
    if (!disabled) {
      inputRef.current?.click()
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files)
    e.target.value = ''
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (!disabled) setDragOver(true)
  }

  function handleDragLeave() {
    setDragOver(false)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    if (!disabled) {
      handleFiles(e.dataTransfer.files)
    }
  }

  function removeFile(index: number) {
    if (disabled) return
    onFilesChange(files.filter((_, i) => i !== index))
  }

  const areaClass = [
    'file-upload-area',
    disabled ? 'disabled' : '',
    dragOver ? 'drag-over' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div>
      <div
        className={areaClass}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleClick()
        }}
        aria-label="Upload FASTQ files"
      >
        <span className="upload-icon">+</span>
        <p>
          <strong>Click or drag</strong> to upload FASTQ files
        </p>
        <p>.fastq, .fq, .fastq.gz, .fq.gz accepted</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".fastq,.fq,.fastq.gz,.fq.gz"
          style={{ display: 'none' }}
          onChange={handleChange}
          disabled={disabled}
        />
      </div>

      {files.length > 0 && (
        <ul className="file-list">
          {files.map((f, i) => (
            <li key={`${f.name}-${f.size}`}>
              {f.name}{' '}
              {!disabled && (
                <button
                  onClick={() => removeFile(i)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--gx-text-muted)',
                    fontSize: '0.75rem',
                    padding: '0 2px',
                    lineHeight: 1,
                  }}
                  aria-label={`Remove ${f.name}`}
                >
                  x
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
