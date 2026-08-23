'use client'

import { useState, useRef, useCallback, DragEvent } from 'react'
import { Paperclip, X, Upload, FileText, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Attachment {
  url: string
  name: string
  type: string
  size: number
}

interface UploadingFile {
  id: string
  name: string
  progress: number
  status: 'uploading' | 'done' | 'error'
  error?: string
}

interface FileUploadProps {
  attachments: Attachment[]
  onAttachmentsChange: (attachments: Attachment[]) => void
  disabled?: boolean
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function uploadFile(file: File, onProgress: (pct: number) => void): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', file)

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          reject(new Error('Invalid response'))
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText)
          reject(new Error(err.error || 'Upload failed'))
        } catch {
          reject(new Error('Upload failed'))
        }
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error')))
    xhr.open('POST', '/api/upload')
    xhr.send(formData)
  })
}

let idCounter = 0

export function FileUpload({ attachments, onAttachmentsChange, disabled }: FileUploadProps) {
  const [uploading, setUploading] = useState<UploadingFile[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      if (fileArray.length === 0) return

      const tasks = fileArray.map(async (file) => {
        const id = `upload-${++idCounter}`
        const entry: UploadingFile = { id, name: file.name, progress: 0, status: 'uploading' }
        setUploading((prev) => [...prev, entry])

        try {
          const result = await uploadFile(file, (pct) => {
            setUploading((prev) =>
              prev.map((u) => (u.id === id ? { ...u, progress: pct } : u))
            )
          })
          setUploading((prev) => prev.filter((u) => u.id !== id))
          onAttachmentsChange([...attachments, result])
        } catch (err) {
          setUploading((prev) =>
            prev.map((u) =>
              u.id === id
                ? { ...u, status: 'error', error: (err as Error).message }
                : u
            )
          )
          // Remove error entries after 3 seconds
          setTimeout(() => {
            setUploading((prev) => prev.filter((u) => u.id !== id))
          }, 3000)
        }
      })

      await Promise.all(tasks)
    },
    [attachments, onAttachmentsChange]
  )

  function handleRemove(index: number) {
    onAttachmentsChange(attachments.filter((_, i) => i !== index))
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,text/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files)
          e.target.value = '' // reset
        }}
      />

      {/* Attachments preview */}
      {(attachments.length > 0 || uploading.length > 0) && (
        <div className="flex flex-wrap gap-2 px-1">
          {attachments.map((att, idx) => (
            <div
              key={att.url + idx}
              className={cn(
                'relative group flex items-center gap-2 rounded-lg border',
                'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800',
                'px-2 py-1.5 max-w-[180px]'
              )}
            >
              {att.type.startsWith('image/') ? (
                <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-gray-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
                  {att.name}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                  {formatSize(att.size)}
                </p>
              </div>
              <button
                onClick={() => handleRemove(idx)}
                className={cn(
                  'shrink-0 p-0.5 rounded-md transition-colors',
                  'opacity-0 group-hover:opacity-100',
                  'hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500'
                )}
                aria-label="移除文件"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {uploading.map((u) => (
            <div
              key={u.id}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-2 py-1.5 max-w-[180px]',
                u.status === 'error'
                  ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
              )}
            >
              <Upload className={cn('w-4 h-4 shrink-0', u.status === 'error' ? 'text-red-400' : 'text-blue-400 animate-pulse')} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{u.name}</p>
                {u.status === 'uploading' && (
                  <div className="mt-0.5 w-full h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-200"
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                )}
                {u.status === 'error' && (
                  <p className="text-[10px] text-red-500">{u.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drag overlay hint / attach button row */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative',
          dragging && 'ring-2 ring-blue-500 rounded-xl bg-blue-50/50 dark:bg-blue-900/20'
        )}
      >
        <button
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className={cn(
            'p-2 rounded-lg transition-colors',
            'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          aria-label="添加附件"
          title="添加附件 (图片、PDF、文本文件, 最大10MB)"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {dragging && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-blue-500 font-medium">松开以上传文件</p>
          </div>
        )}
      </div>
    </div>
  )
}
