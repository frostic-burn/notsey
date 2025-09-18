"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Mail, Lock } from "lucide-react"
import { signUp, signIn } from "../lib/auth"
import { supabase } from "../lib/supabaseClient"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        console.log("User signed in:", session.user.email)
        setMessage("Successfully signed in!")
        setTimeout(() => {
          onSuccess()
          onClose()
          // Remove this line that causes page refresh:
          // window.location.href = "/dashboard"
        }, 500)
      }
    })

    return () => subscription.unsubscribe()
  }, [onSuccess, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)

    if (!email || !password) {
      setError("Please fill in all fields")
      setLoading(false)
      return
    }

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      if (isLogin) {
        const { data, error } = await signIn(email, password)

        if (error) {
          setError(error.message || "Failed to sign in")
          setLoading(false)
        } else if (data?.user) {
          setMessage("Signing in...")
        }
      } else {
        const { data, error } = await signUp(email, password)

        if (error) {
          setError(error.message || "Failed to create account")
          setLoading(false)
        } else if (data?.user) {
          if (data.user.email_confirmed_at) {
            setMessage("Account created successfully!")
          } else {
            setMessage("Account created! Please check your email for confirmation, then sign in.")
            setTimeout(() => {
              setIsLogin(true)
              setMessage("")
              setEmail("")
              setPassword("")
              setConfirmPassword("")
              setLoading(false)
            }, 2000)
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred")
      setLoading(false)
    }
  }

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <div className="auth-modal-header">
          <h2 className="auth-modal-title">{isLogin ? "Welcome Back" : "Create Account"}</h2>
          <button onClick={onClose} className="auth-modal-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <Mail className="auth-field-icon" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              required
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <Lock className="auth-field-icon" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          {!isLogin && (
            <div className="auth-field">
              <Lock className="auth-field-icon" />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-success">{message}</div>}

          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
          </button>

          <div className="auth-switch">
            <span className="auth-switch-text">{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setError("")
                setMessage("")
                setEmail("")
                setPassword("")
                setConfirmPassword("")
              }}
              className="auth-switch-btn"
              disabled={loading}
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
