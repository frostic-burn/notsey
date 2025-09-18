import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import "./theme.css"
import "./glass.css"
import "./components.css"
import "./transitions.css"

export const metadata: Metadata = {
  title: "Notsey - AI-Powered Notes",
  description: "A beautiful dark-themed notes app with AI analysis",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
