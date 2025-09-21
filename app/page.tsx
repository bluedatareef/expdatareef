import Link from 'next/link'

import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        <img 
          src="https://labs.landsurveyorsunited.com/datareef/icons/web/android-chrome-192x192.png" 
          alt="DataReef Logo" 
          className="mx-auto h-20 sm:h-24 w-auto mb-6 sm:mb-8" 
        />
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-teal-400 mb-4 sm:mb-6">
          DataReef Sustainability Dashboard
        </h1>
        <p className="text-lg sm:text-xl text-gray-300 mb-6 sm:mb-8 px-4">
          A comprehensive tool to assess and track sustainability metrics for tourist destinations worldwide.
        </p>
        <Link 
          href="/ai-app"
          className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-teal-500"
        >
          Launch Dashboard
          <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
        <div className="mt-8 sm:mt-12 text-sm text-gray-500">
          <p>Powered by AI • Built for Sustainability</p>
        </div>
      </div>
    </div>
  )
}