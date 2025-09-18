import { supabase } from "./supabaseClient"
import { getCurrentUser } from "./auth"

export interface Note {
  id: string
  title: string
  content: string
  collection?: string
  createdAt: Date
  updatedAt: Date
  contentHash: string
}

export interface AiChat {
  id: string
  noteId: string
  messages: any[]
  lastAnalysis: string
  contentHash: string
  updatedAt: Date
}

export const createContentHash = (title: string, content: string): string => {
  return btoa(unescape(encodeURIComponent(title + "|" + content))).slice(0, 20)
}

const handleDatabaseError = (error: any, operation: string) => {
  // Only log actual database errors, not fetch errors
  if (!error.message?.includes("Failed to fetch")) {
    console.error(`Error in ${operation}:`, error)
  }

  if (error.message?.includes("does not exist") || error.code === "42P01") {
    return { tableNotExists: true }
  }

  return { tableNotExists: false }
}

export const saveNote = async (note: Omit<Note, "id" | "createdAt" | "updatedAt">): Promise<Note | null> => {
  try {
    const user = await getCurrentUser()
    if (!user) {
      console.error("No authenticated user for saving note")
      return null
    }

    const contentHash = createContentHash(note.title, note.content)

    const { data, error } = await supabase
      .from("notes")
      .insert({
        title: note.title || "",
        content: note.content || "",
        collection: note.collection || "General",
        user_id: user.id,
        content_hash: contentHash,
      })
      .select()
      .single()

    if (error) {
      const errorInfo = handleDatabaseError(error, "saveNote")
      if (errorInfo.tableNotExists) {
        return null
      }
      console.error("Database error in saveNote:", error)
      return null
    }

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      collection: data.collection,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      contentHash: data.content_hash,
    }
  } catch (error) {
    console.error("Unexpected error in saveNote:", error)
    return null
  }
}

export const updateNote = async (id: string, updates: Partial<Note>): Promise<Note | null> => {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    const updateData: any = {}

    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.content !== undefined) updateData.content = updates.content
    if (updates.collection !== undefined) updateData.collection = updates.collection

    if (updates.title !== undefined || updates.content !== undefined) {
      updateData.content_hash = createContentHash(updates.title || "", updates.content || "")
    }

    const { data, error } = await supabase
      .from("notes")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      const errorInfo = handleDatabaseError(error, "updateNote")
      if (errorInfo.tableNotExists) {
        return null
      }
      console.error("Database error in updateNote:", error)
      return null
    }

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      collection: data.collection,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      contentHash: data.content_hash,
    }
  } catch (error) {
    console.error("Unexpected error in updateNote:", error)
    return null
  }
}

export const getUserNotes = async (): Promise<Note[]> => {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })

    if (error) {
      const errorInfo = handleDatabaseError(error, "getUserNotes")
      if (errorInfo.tableNotExists) {
        return []
      }
      return []
    }

    if (!data) {
      return []
    }

    return data.map((note) => ({
      id: note.id,
      title: note.title || "",
      content: note.content || "",
      collection: note.collection || "General",
      createdAt: new Date(note.created_at),
      updatedAt: new Date(note.updated_at),
      contentHash: note.content_hash || "",
    }))
  } catch (error) {
    // Silently handle errors to prevent console spam
    return []
  }
}

export const deleteNote = async (id: string): Promise<boolean> => {
  try {
    const user = await getCurrentUser()
    if (!user) return false

    const { error } = await supabase.from("notes").delete().eq("id", id).eq("user_id", user.id)

    if (error) {
      const errorInfo = handleDatabaseError(error, "deleteNote")
      if (errorInfo.tableNotExists) {
        return false
      }
      console.error("Database error in deleteNote:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Unexpected error in deleteNote:", error)
    return false
  }
}

export const saveAiChat = async (
  noteId: string,
  messages: any[],
  lastAnalysis: string,
  contentHash: string,
): Promise<void> => {
  try {
    const user = await getCurrentUser()
    if (!user) return

    const { error } = await supabase.from("ai_chats").upsert({
      note_id: noteId,
      user_id: user.id,
      messages: messages || [],
      last_analysis: lastAnalysis || "",
      content_hash: contentHash || "",
    })

    if (error) {
      handleDatabaseError(error, "saveAiChat")
    }
  } catch (error) {
    console.error("Unexpected error in saveAiChat:", error)
  }
}

export const getAiChat = async (noteId: string): Promise<AiChat | null> => {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    const { data, error } = await supabase
      .from("ai_chats")
      .select("*")
      .eq("note_id", noteId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) {
      const errorInfo = handleDatabaseError(error, "getAiChat")
      if (errorInfo.tableNotExists) {
        return null
      }
      console.error("Database error in getAiChat:", error)
      return null
    }

    if (!data) return null

    return {
      id: data.id,
      noteId: data.note_id,
      messages: data.messages || [],
      lastAnalysis: data.last_analysis || "",
      contentHash: data.content_hash || "",
      updatedAt: new Date(data.updated_at),
    }
  } catch (error) {
    console.error("Unexpected error in getAiChat:", error)
    return null
  }
}

export const checkDatabaseSetup = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from("notes").select("id").limit(1)
    return !error
  } catch (error) {
    return false
  }
}
