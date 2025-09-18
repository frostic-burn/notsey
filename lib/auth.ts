import { supabase } from "./supabaseClient"

export const signUp = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://your-domain.vercel.app"}/dashboard`,
      },
    })

    if (error) {
      console.error("SignUp error:", error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error("Error in signUp:", error)
    return { data: null, error }
  }
}

export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("SignIn error:", error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error("Error in signIn:", error)
    return { data: null, error }
  }
}

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("SignOut error:", error)
    }
    return { error }
  } catch (error) {
    console.error("Error in signOut:", error)
    return { error }
  }
}

export const getCurrentUser = async () => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      // Don't log fetch errors, just return null
      if (error.message?.includes("Failed to fetch")) {
        return null
      }
      console.error("Error getting user:", error)
      return null
    }

    return user
  } catch (error) {
    // Silently handle fetch errors
    return null
  }
}

export const getSession = async () => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      // Don't log fetch errors, just return null
      if (error.message?.includes("Failed to fetch")) {
        return null
      }
      console.error("Error getting session:", error)
      return null
    }

    return session
  } catch (error) {
    // Silently handle fetch errors
    return null
  }
}
