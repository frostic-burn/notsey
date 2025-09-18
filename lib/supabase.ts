import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      notes: {
        Row: {
          id: string
          title: string
          content: string
          collection: string | null
          created_at: string
          updated_at: string
          user_id: string
          content_hash: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          collection?: string | null
          created_at?: string
          updated_at?: string
          user_id: string
          content_hash: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          collection?: string | null
          updated_at?: string
          content_hash?: string
        }
      }
      ai_chats: {
        Row: {
          id: string
          note_id: string
          user_id: string
          messages: any[]
          last_analysis: string
          content_hash: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          note_id: string
          user_id: string
          messages: any[]
          last_analysis: string
          content_hash: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          messages?: any[]
          last_analysis?: string
          content_hash?: string
          updated_at?: string
        }
      }
    }
  }
}

export { supabaseClient as supabase }
