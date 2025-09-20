import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <img 
          src="https://labs.landsurveyorsunited.com/datareef/icons/web/android-chrome-192x192.png" 
          alt="DataReef Logo" 
          className="mx-auto h-24 w-auto mb-8" 
        />
        <h1 className="text-5xl font-bold text-teal-400 mb-6">
          DataReef Sustainability Dashboard
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          A comprehensive tool to assess and track sustainability metrics for tourist destinations worldwide.
        </p>
        <Link 
          href="/ai-app"
          className="inline-flex items-center px-8 py-4 text-lg font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-lg transition-colors duration-200"
        >
          Launch Dashboard
          <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  )
}