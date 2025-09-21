'use client'

import ErrorBoundary from '../../components/ErrorBoundary'
import AIApp from '../../components/AIApp'

export default function AIAppPage() {
  return (
    <ErrorBoundary>
      <AIApp />
    </ErrorBoundary>
  )
}