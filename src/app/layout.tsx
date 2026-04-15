import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/hooks/useAuth"

export const metadata: Metadata = {
  title: "Lukhas Brackes",
  description: "CRM de prospecção e vendas automatizado",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased overflow-x-hidden" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
