import { type Metadata } from 'next'
import { Geist, Geist_Mono, Montserrat } from 'next/font/google'
import { AuthProvider } from '@/lib/AuthContext'
import { BackendAuthProvider } from '@/lib/contexts/BackendAuthContext'
import { ReactQueryProvider } from '@/lib/ReactQueryProvider'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'NexAgent - The Future of AI Intelligence',
  description: 'Experience the power of advanced artificial intelligence designed for the future. Transform your workflow with cutting-edge automation and intelligent insights.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} antialiased h-full bg-black`}>
        <ReactQueryProvider>
          <AuthProvider>
            <BackendAuthProvider>
              <div className="h-full">
                {children}
              </div>
            </BackendAuthProvider>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  )
}
