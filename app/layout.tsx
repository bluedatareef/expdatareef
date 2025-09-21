import '../styles/globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'DataReef Sustainability Dashboard',
  description: 'A comprehensive tool to assess and track sustainability metrics for tourist destinations worldwide. Features AI-powered analysis, SDG alignment tracking, and stakeholder reporting.',
  keywords: 'sustainability, tourism, assessment, SDG, GSTC, environmental, social, economic',
  authors: [{ name: 'DataReef' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.css" rel="stylesheet" />
        <link rel="icon" href="https://labs.landsurveyorsunited.com/datareef/icons/web/android-chrome-192x192.png" />
      </head>
      <body className={`${inter.className} bg-gray-900`}>
        {children}
      </body>
    </html>
  )
}