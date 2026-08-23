'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './CodeBlock'
import { cn } from '@/lib/utils'
import type { Components } from 'react-markdown'

interface MarkdownRendererProps {
  content: string
  className?: string
}

const components: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    const codeString = String(children).replace(/\n$/, '')

    // Block code (has language class or is multi-line)
    const isBlock = match || codeString.includes('\n')

    if (isBlock) {
      return <CodeBlock language={match?.[1]} code={codeString} />
    }

    // Inline code
    return (
      <code
        className={cn(
          'px-1.5 py-0.5 rounded text-sm font-mono',
          'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
          className
        )}
        {...props}
      >
        {children}
      </code>
    )
  },
  pre({ children }) {
    // Let the code component handle everything
    return <>{children}</>
  },
  a({ href, children, ...props }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-zinc-900 dark:text-zinc-100 underline underline-offset-2 hover:text-zinc-600 dark:hover:text-zinc-400 break-all"
        {...props}
      >
        {children}
      </a>
    )
  },
  table({ children, ...props }) {
    return (
      <div className="overflow-x-auto my-3">
        <table
          className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded"
          {...props}
        >
          {children}
        </table>
      </div>
    )
  },
  th({ children, ...props }) {
    return (
      <th
        className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100"
        {...props}
      >
        {children}
      </th>
    )
  },
  td({ children, ...props }) {
    return (
      <td
        className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 border-t border-zinc-200 dark:border-zinc-800"
        {...props}
      >
        {children}
      </td>
    )
  },
  ul({ children, ...props }) {
    return (
      <ul className="list-disc list-inside my-2 space-y-1" {...props}>
        {children}
      </ul>
    )
  },
  ol({ children, ...props }) {
    return (
      <ol className="list-decimal list-inside my-2 space-y-1" {...props}>
        {children}
      </ol>
    )
  },
  p({ children, ...props }) {
    return (
      <p className="my-2 leading-relaxed break-words" {...props}>
        {children}
      </p>
    )
  },
  h1({ children, ...props }) {
    return <h1 className="text-xl font-bold my-3" {...props}>{children}</h1>
  },
  h2({ children, ...props }) {
    return <h2 className="text-lg font-bold my-3" {...props}>{children}</h2>
  },
  h3({ children, ...props }) {
    return <h3 className="text-base font-bold my-2" {...props}>{children}</h3>
  },
  blockquote({ children, ...props }) {
    return (
      <blockquote
        className="border-l-4 border-zinc-300 dark:border-zinc-700 pl-4 my-3 text-zinc-600 dark:text-zinc-400 italic"
        {...props}
      >
        {children}
      </blockquote>
    )
  },
  hr(props) {
    return <hr className="my-4 border-zinc-200 dark:border-zinc-800" {...props} />
  },
}

export const MarkdownRenderer = React.memo(function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  return (
    <div className={cn('prose-sm max-w-none break-words overflow-hidden text-zinc-800 dark:text-zinc-200', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
})
