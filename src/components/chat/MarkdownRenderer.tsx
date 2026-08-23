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
          'bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400',
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
        className="text-blue-600 dark:text-blue-400 hover:underline"
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
          className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded"
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
        className="px-3 py-2 bg-gray-50 dark:bg-gray-800 text-left text-sm font-semibold text-gray-900 dark:text-gray-100"
        {...props}
      >
        {children}
      </th>
    )
  },
  td({ children, ...props }) {
    return (
      <td
        className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700"
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
      <p className="my-2 leading-relaxed" {...props}>
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
        className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-3 text-gray-600 dark:text-gray-400 italic"
        {...props}
      >
        {children}
      </blockquote>
    )
  },
  hr(props) {
    return <hr className="my-4 border-gray-200 dark:border-gray-700" {...props} />
  },
}

export const MarkdownRenderer = React.memo(function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  return (
    <div className={cn('prose-sm max-w-none text-gray-800 dark:text-gray-200', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
})
