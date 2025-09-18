"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"

export default function Dashboard() {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        // User is authenticated, redirect to main app
        router.push("/")
      } else {
        // No session, redirect to login
        router.push("/")
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/60 border-t-transparent mx-auto mb-4"></div>
        <p className="text-white/70">Redirecting...</p>
      </div>
    </div>
  )
}
