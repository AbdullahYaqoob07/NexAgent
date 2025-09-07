import { type Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#FF6900",
          colorText: "#ffffff",
          colorTextSecondary: "#ffffff80",
          colorBackground: "rgba(0, 0, 0, 0.4)",
          colorInputBackground: "rgba(255, 255, 255, 0.05)",
          colorInputText: "#ffffff",
          borderRadius: "0.75rem",
          fontFamily: "ui-sans-serif, system-ui, sans-serif"
        },
        elements: {
          card: "bg-black/40 backdrop-blur-xl border border-white/10",
          headerTitle: "text-white",
          headerSubtitle: "text-white/70",
          formButtonPrimary: "bg-gradient-to-r from-[#FF6900] to-[#FF8555] hover:from-[#E55D00] hover:to-[#E66A33]",
          footerActionLink: "text-[#FF6900] hover:text-[#FF8555]"
        }
      }}
    >
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
