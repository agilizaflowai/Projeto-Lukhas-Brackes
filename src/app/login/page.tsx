'use client'

import { useState } from 'react'
import Image from 'next/image'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const { login } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const err = await login(email, password)
    if (err) {
      setError(err)
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8faf7] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 flex items-center justify-center">
          <Image
            src="/logo.svg"
            alt="Lukhas Brackes"
            width={260}
            height={146}
            priority
            className="h-auto w-full max-w-[260px]"
          />
        </div>

        {/* Card */}
        <div className="bg-white rounded-[20px] border border-[#EFEFEF] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] p-8">
          <div className="text-center mb-6">
            <h1 className="text-[22px] font-bold text-[#1B3A2D]">Entrar</h1>
            <p className="text-[14px] text-[#9CA3AF] mt-1">Acesse o painel de automação</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[12px] font-semibold text-[#414844] uppercase tracking-wide mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                required
                className="w-full bg-[#F7F8F9] border border-[#EFEFEF] rounded-[10px] px-4 py-2.5 text-[14px] text-[#1B3A2D] focus:outline-none focus:border-[#C8E645] focus:ring-2 focus:ring-[#C8E645]/20 transition-all placeholder-[#9CA3AF]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[12px] font-semibold text-[#414844] uppercase tracking-wide mb-1.5">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="w-full bg-[#F7F8F9] border border-[#EFEFEF] rounded-[10px] px-4 py-2.5 text-[14px] text-[#1B3A2D] focus:outline-none focus:border-[#C8E645] focus:ring-2 focus:ring-[#C8E645]/20 transition-all placeholder-[#9CA3AF]"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl">
                <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
                <span className="text-[13px] text-[#EF4444] font-medium">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-[#C8E645] text-[#1B3A2D] font-bold py-3 rounded-full text-[14px] hover:bg-[#b8d635] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(200,230,69,0.35)]"
            >
              {pending ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#1B3A2D]/30 border-t-[#1B3A2D] rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#9CA3AF] mt-6">
          CRM Inteligente para Personal Trainers
        </p>
      </div>
    </div>
  )
}
