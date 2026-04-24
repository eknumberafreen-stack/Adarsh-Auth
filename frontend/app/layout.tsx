import './globals.css'
import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Adarsh Auth Platform',
  description: 'Self-hosted authentication and licensing platform for software developers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(15, 23, 42, 0.96)',
              color: '#e2e8f0',
              border: '1px solid rgba(148, 163, 184, 0.18)',
              borderRadius: '16px',
            },
          }}
        />
      </body>
    </html>
  )
}
