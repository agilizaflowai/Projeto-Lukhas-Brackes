import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Agiliza Flow",
  description: "CRM de prospecção e vendas automatizado",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  )
}
