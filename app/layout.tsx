import type React from "react"
import type { Metadata } from "next"
import { Geologica } from "next/font/google"
import "./globals.css"

const geologica = Geologica({ subsets: ["latin"], variable: "--font-geologica" })

export const metadata: Metadata = {
  title: "Houston - Plataforma de Gestão de Vagas Médicas",
  description: "Plataforma para gestão de vagas médicas e escalas hospitalares",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${geologica.variable} font-geologica bg-app-bg`}>{children}</body>
    </html>
  )
}
