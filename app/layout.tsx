import '../styles/globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'DataReef Sustainability Dashboard',
  description: 'A comprehensive tool to assess and track sustainability metrics for various tourist destinations.',
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
      </head>
      <body className={`${inter.className} bg-gray-900`}>
        {children}
      </body>
    </html>
  )
}