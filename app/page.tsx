"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import {
  FileText,
  FolderOpen,
  Brain,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  X,
  Trash2,
  Sparkles,
  Save,
  LogOut,
  AlertCircle,
  Database,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AiChatBubble from "../components/AiChatBubble"
import RichEditor from "../components/RichEditor"
import AiChatPane from "../components/AiChatPane"
import AuthModal from "../components/AuthModal"
import { signOut } from "../lib/auth"
import {
  getUserNotes,
  saveNote,
  updateNote,
  deleteNote,
  createContentHash,
  saveAiChat,
  getAiChat,
  checkDatabaseSetup,
  type Note,
} from "../lib/notes"
import { generateShortAIAnalysis, generateContextualReply } from "../lib/ai"
import { supabase } from "../lib/supabaseClient"

interface Collection {
  id: string
  name: string
  noteCount: number
}

const noteAnalysisCache = {} as Record<string, { analysis: string; contentHash: string }>

const setNoteAnalysisCache = (
  callback: (
    prev: Record<string, { analysis: string; contentHash: string }>,
  ) => Record<string, { analysis: string; contentHash: string }>,
) => {
  console.log("Updating note analysis cache")
}

export default function NotesApp() {
  const [user, setUser] = useState<any>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isCollectionsExpanded, setIsCollectionsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [editNote, setEditNote] = useState({ title: "", content: "" })
  const [showAICard, setShowAICard] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState("")
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [isNewNote, setIsNewNote] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [aiChatData, setAiChatData] = useState<Record<string, any>>({})
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false)
  const [showAiChat, setShowAiChat] = useState(false)
  const [aiChatNoteTitle, setAiChatNoteTitle] = useState("")
  const [aiChatContent, setAiChatContent] = useState("")
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [databaseSetup, setDatabaseSetup] = useState<boolean | null>(null)
  const [showDatabaseWarning, setShowDatabaseWarning] = useState(false)

  // Enhanced state for better UX
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [recentNotes, setRecentNotes] = useState<Note[]>([])

  // Refs for performance optimization
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>()
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const editorRef = useRef<HTMLDivElement>(null)

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "n":
            e.preventDefault()
            handleCreateNote()
            break
          case "s":
            if (isEditorOpen) {
              e.preventDefault()
              handleSaveNote()
            }
            break
          case "k":
            e.preventDefault()
            document.querySelector<HTMLInputElement>('input[placeholder="Search notes..."]')?.focus()
            break
          case "Escape":
            if (isEditorOpen) {
              e.preventDefault()
              handleCloseEditor()
            }
            break
          case "/":
            e.preventDefault()
            document.querySelector<HTMLInputElement>('input[placeholder="Search notes..."]')?.focus()
            break
        }
      }

      // Editor-specific shortcuts
      if (isEditorOpen && (e.ctrlKey || e.metaKey)) {
        switch (e.key) {
          case "Enter":
            e.preventDefault()
            handleGenerateAI()
            break
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isEditorOpen])

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && selectedNote && !isNewNote) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave()
      }, 2000) // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [editNote, hasUnsavedChanges, selectedNote, isNewNote])

  // Enhanced search with debouncing
  const debouncedSearch = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(query)
    }, 300)
  }, [])

  // Memoized filtered notes for better performance
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes

    const query = searchQuery.toLowerCase()
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.collection?.toLowerCase().includes(query),
    )
  }, [notes, searchQuery])

  // Recent notes tracking
  useEffect(() => {
    const recent = notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5)
    setRecentNotes(recent)
  }, [notes])

  const handleAutoSave = useCallback(async () => {
    if (!selectedNote || isNewNote || !hasUnsavedChanges) return

    setIsSaving(true)
    try {
      const updatedNote = await updateNote(selectedNote.id, {
        title: editNote.title,
        content: editNote.content,
      })

      if (updatedNote) {
        setNotes(notes.map((note) => (note.id === selectedNote.id ? updatedNote : note)))
        setSelectedNote(updatedNote)
        setHasUnsavedChanges(false)
        setLastSaved(new Date())

        const newContentHash = createContentHash(editNote.title, editNote.content)
        if (newContentHash !== selectedNote.contentHash) {
          await handleNoteContentChanged(updatedNote)
        }
      }
    } catch (error) {
      console.error("Auto-save failed:", error)
    } finally {
      setIsSaving(false)
    }
  }, [selectedNote, editNote, notes, hasUnsavedChanges, isNewNote])

  // Enhanced note content change handler
  const handleNoteChange = useCallback((field: "title" | "content", value: string) => {
    setEditNote((prev) => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
  }, [])

  useEffect(() => {
    initializeApp()
  }, [])

  // Listen for auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user)
        setShowAuthModal(false)
        if (databaseSetup) {
          await loadUserNotes()
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setNotes([])
        setShowAuthModal(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [databaseSetup])

  const initializeApp = async () => {
    const isSetup = await checkDatabaseSetup()
    setDatabaseSetup(isSetup)

    if (!isSetup) {
      setShowDatabaseWarning(true)
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user) {
      setUser(session.user)
      setShowAuthModal(false)
      if (isSetup) {
        await loadUserNotes()
      }
    } else {
      setShowAuthModal(true)
    }
  }

  const loadUserNotes = async () => {
    try {
      const userNotes = await getUserNotes()
      setNotes(userNotes)
    } catch (error) {
      console.error("Error loading user notes:", error)
      setNotes([])
    }
  }

  const handleAuthSuccess = () => {
    // Auth state change listener will handle this
  }

  const handleSignOut = async () => {
    // Save any unsaved changes before signing out
    if (hasUnsavedChanges && selectedNote && !isNewNote) {
      await handleAutoSave()
    }

    await signOut()
    setUser(null)
    setNotes([])
    setShowAuthModal(true)
  }

  const [collections] = useState<Collection[]>([
    { id: "1", name: "Getting Started", noteCount: 1 },
    { id: "2", name: "Work", noteCount: 2 },
    { id: "3", name: "Learning", noteCount: 1 },
    { id: "4", name: "Personal", noteCount: 0 },
  ])

  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js"
    script.onload = () => {
      if (window.particlesJS) {
        window.particlesJS("particles-js", {
          particles: {
            number: {
              value: 115,
              density: {
                enable: true,
                value_area: 800,
              },
            },
            color: {
              value: "#898989",
            },
            shape: {
              type: "star",
              stroke: {
                width: 0,
                color: "#000000",
              },
              polygon: {
                nb_sides: 5,
              },
            },
            opacity: {
              value: 0.5,
              random: false,
              anim: {
                enable: false,
                speed: 1,
                opacity_min: 0.1,
                sync: false,
              },
            },
            size: {
              value: 5,
              random: true,
              anim: {
                enable: false,
                speed: 4.859755554295621,
                size_min: 0.1,
                sync: false,
              },
            },
            line_linked: {
              enable: false,
              distance: 150,
              color: "#ffffff",
              opacity: 0.4,
              width: 1,
            },
            move: {
              enable: true,
              speed: 3,
              direction: "none",
              random: false,
              straight: false,
              out_mode: "out",
              bounce: false,
              attract: {
                enable: false,
                rotateX: 4078.3686525389858,
                rotateY: 1200,
              },
            },
          },
          interactivity: {
            detect_on: "canvas",
            events: {
              onhover: {
                enable: false,
                mode: "repulse",
              },
              onclick: {
                enable: true,
                mode: "push",
              },
              resize: true,
            },
            modes: {
              grab: {
                distance: 400,
                line_linked: {
                  opacity: 1,
                },
              },
              bubble: {
                distance: 400,
                size: 40,
                duration: 2,
                opacity: 8,
                speed: 3,
              },
              repulse: {
                distance: 200,
                duration: 0.4,
              },
              push: {
                particles_nb: 4,
              },
              remove: {
                particles_nb: 2,
              },
            },
          },
          retina_detect: false,
        })
      }
    }
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  const handleCreateNote = () => {
    if (!databaseSetup) {
      setShowDatabaseWarning(true)
      return
    }

    // Save current note if there are unsaved changes
    if (hasUnsavedChanges && selectedNote && !isNewNote) {
      handleAutoSave()
    }

    setSelectedNote(null)
    setEditNote({ title: "", content: "" })
    setIsNewNote(true)
    setIsEditorOpen(true)
    setShowAICard(false)
    setAiAnalysis("")
    setHasUnsavedChanges(false)
    setLastSaved(null)

    // Focus on title input after a brief delay
    setTimeout(() => {
      const titleInput = document.querySelector<HTMLInputElement>('input[placeholder="Note title..."]')
      titleInput?.focus()
    }, 100)
  }

  const handleNoteClick = (note: Note) => {
    // Save current note if there are unsaved changes
    if (hasUnsavedChanges && selectedNote && !isNewNote) {
      handleAutoSave()
    }

    setSelectedNote(note)
    setEditNote({ title: note.title, content: note.content })
    setIsNewNote(false)
    setIsEditorOpen(true)
    setHasUnsavedChanges(false)
    setLastSaved(null)
  }

  const handleSaveNote = async () => {
    if (!databaseSetup) {
      setShowDatabaseWarning(true)
      return
    }

    if (!editNote.title.trim() && !editNote.content.trim()) return

    setIsSaving(true)
    try {
      if (isNewNote) {
        const newNote = await saveNote({
          title: editNote.title || "Untitled",
          content: editNote.content,
          collection: "General",
          contentHash: createContentHash(editNote.title, editNote.content),
        })
        if (newNote) {
          setNotes([newNote, ...notes])
          setSelectedNote(newNote)
          setIsNewNote(false)
          setHasUnsavedChanges(false)
          setLastSaved(new Date())
        }
      } else if (selectedNote) {
        const updatedNote = await updateNote(selectedNote.id, {
          title: editNote.title,
          content: editNote.content,
        })
        if (updatedNote) {
          setNotes(notes.map((note) => (note.id === selectedNote.id ? updatedNote : note)))
          setSelectedNote(updatedNote)
          setHasUnsavedChanges(false)
          setLastSaved(new Date())

          const newContentHash = createContentHash(editNote.title, editNote.content)
          if (newContentHash !== selectedNote.contentHash) {
            await handleNoteContentChanged(updatedNote)
          }
        }
      }
    } catch (error) {
      console.error("Error saving note:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteNote = async () => {
    if (!selectedNote) return

    // Show confirmation dialog
    if (!window.confirm(`Are you sure you want to delete "${selectedNote.title}"? This action cannot be undone.`)) {
      return
    }

    const success = await deleteNote(selectedNote.id)
    if (success) {
      setNotes(notes.filter((note) => note.id !== selectedNote.id))
      setIsEditorOpen(false)
      setHasUnsavedChanges(false)
    }
  }

  const handleCloseEditor = () => {
    // Auto-save before closing if there are unsaved changes
    if (hasUnsavedChanges && selectedNote && !isNewNote) {
      handleAutoSave()
    }

    setIsEditorOpen(false)
    setShowAICard(false)
    setAiAnalysis("")
    setHasUnsavedChanges(false)
  }

  const handleGenerateAI = async () => {
    if (!editNote.content.trim()) return

    // Auto-save before analyzing
    await handleSaveNote()

    if (!selectedNote) return

    setIsGeneratingAI(true)
    setShowAICard(true)

    try {
      const analysis = await generateShortAIAnalysis(selectedNote.title, selectedNote.content)
      setAiAnalysis(analysis)

      // Save to chat history
      const aiMessage = {
        role: "ai" as const,
        content: analysis,
        timestamp: new Date(),
      }

      await saveAiChat(selectedNote.id, [aiMessage], analysis, selectedNote.contentHash)
    } catch (error) {
      setAiAnalysis("Error analyzing note. Please try again.")
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleAnalyse = async (note: Note) => {
    const contentHash = btoa(note.content).slice(0, 20)

    if (noteAnalysisCache[note.id] && noteAnalysisCache[note.id].contentHash === contentHash) {
      setAiChatContent(noteAnalysisCache[note.id].analysis)
      setAiChatNoteTitle(note.title)
      setShowAiChat(true)
      return
    }

    setIsAnalysisLoading(true)
    setAiChatNoteTitle(note.title)
    setShowAiChat(true)

    try {
      const analysis = await generateShortAIAnalysis(note.title, note.content)
      setAiChatContent(analysis)

      setNoteAnalysisCache((prev) => ({
        ...prev,
        [note.id]: { analysis, contentHash },
      }))
    } catch (error) {
      setAiChatContent("Error analyzing note. Please check your connection and try again.")
    } finally {
      setIsAnalysisLoading(false)
    }
  }

  const handleNoteContentChanged = async (note: Note) => {
    const existingChat = await getAiChat(note.id)

    if (existingChat && existingChat.messages.length > 0) {
      const contextualReply = await generateContextualReply(note.title, note.content, existingChat.messages)

      const newMessage = {
        role: "ai",
        content: contextualReply,
        timestamp: new Date(),
      }

      const updatedMessages = [...existingChat.messages, newMessage]
      await saveAiChat(note.id, updatedMessages, contextualReply, note.contentHash)

      setAiChatData((prev) => ({
        ...prev,
        [note.id]: {
          messages: updatedMessages,
          lastAnalysis: contextualReply,
          contentHash: note.contentHash,
        },
      }))
    }
  }

  const handleAiAnalysis = async (note: Note) => {
    setSelectedNote(note)
    setAiPanelOpen(true)
  }

  const DatabaseWarning = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-modal max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Database Setup Required</h3>
        </div>
        <p className="text-white/80 mb-6 leading-relaxed">
          The database tables haven't been created yet. Please run the SQL setup scripts in your Supabase dashboard to
          enable full functionality.
        </p>
        <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-white/70 mb-2">Steps to fix:</p>
          <ol className="text-sm text-white/60 space-y-1 list-decimal list-inside">
            <li>Go to your Supabase dashboard</li>
            <li>Navigate to SQL Editor</li>
            <li>Run the setup scripts provided</li>
            <li>Refresh this page</li>
          </ol>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setShowDatabaseWarning(false)} className="flex-1 glass-button">
            Continue Anyway
          </Button>
          <Button onClick={() => window.location.reload()} className="flex-1 new-note-button">
            <Database className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white relative overflow-hidden">
      {showDatabaseWarning && <DatabaseWarning />}

      <div id="particles-js" className="absolute inset-0 z-0 opacity-60"></div>

      <div className="absolute top-20 right-20 w-40 h-40 rounded-full bg-gradient-to-br from-purple-500/10 to-blue-500/10 blur-3xl"></div>

      <div className="relative z-20 flex min-h-screen">
        <div className="w-64 glass-sidebar p-5 flex flex-col h-[calc(100vh-32px)] m-4 mr-2">
          <div className="mb-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Notsey
            </h1>
            <p className="text-sm text-white/50 mt-1 font-medium">AI-Powered Notes</p>
            {!databaseSetup && (
              <div className="mt-2 flex items-center gap-2 text-xs text-yellow-400">
                <AlertCircle className="w-3 h-3" />
                <span>Setup required</span>
              </div>
            )}
            {!isOnline && (
              <div className="mt-2 flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-3 h-3" />
                <span>Offline</span>
              </div>
            )}
          </div>

          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Search notes... (Ctrl+K)"
                onChange={(e) => debouncedSearch(e.target.value)}
                className="glass-input pl-12 text-white placeholder-white/40 border-0 h-12 text-sm font-medium"
              />
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            <div className="sidebar-item active">
              <FileText className="w-5 h-5" />
              <span>All Notes</span>
              <span className="ml-auto text-xs bg-blue-500/20 px-2.5 py-1 rounded-full font-semibold">
                {notes.length}
              </span>
            </div>

            <div>
              <div className="sidebar-item" onClick={() => setIsCollectionsExpanded(!isCollectionsExpanded)}>
                {isCollectionsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <FolderOpen className="w-5 h-5" />
                <span>Collections</span>
              </div>

              {isCollectionsExpanded && (
                <div className="ml-6 mt-2 space-y-1 fade-in">
                  <div className="sidebar-item text-sm py-2">
                    <span>General</span>
                    <span className="ml-auto text-xs text-white/40 font-medium">{notes.length}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="sidebar-item ai-analysis-btn" onClick={() => setAiPanelOpen(true)}>
              <Brain className="w-5 h-5 ai-brain-icon" />
              <span>AI Analysis</span>
            </div>

            <div className="mt-auto pt-4 border-t border-white/10">
              <div className="sidebar-item" onClick={handleSignOut}>
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </div>
            </div>
          </nav>
        </div>

        <div className="flex-1 p-8 pl-4">
          <div className="floating-header">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white/95 letter-spacing-tight">All Notes</h2>
                <p className="text-white/60 mt-2 font-medium">
                  {filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"}
                  {searchQuery && ` matching "${searchQuery}"`}
                  {!databaseSetup && (
                    <span className="ml-2 text-yellow-400 text-sm">
                      (Database setup required for full functionality)
                    </span>
                  )}
                </p>
              </div>

              <Button onClick={handleCreateNote} className="new-note-button px-6 py-3 font-semibold text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Note (Ctrl+N)
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note) => (
              <div key={note.id} className="note-card group" onClick={() => handleNoteClick(note)}>
                <div className="flex items-start justify-between mb-4">
                  <h3 className="note-title line-clamp-2">{note.title}</h3>
                </div>

                <p
                  className="note-content line-clamp-4"
                  dangerouslySetInnerHTML={{ __html: note.content.replace(/<[^>]*>/g, "") }}
                ></p>

                <div className="flex items-center justify-between note-meta">
                  <span className="font-medium">{note.collection}</span>
                  <span>{note.updatedAt.toLocaleDateString()}</span>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAiAnalysis(note)
                    }}
                    className="w-full glass-button text-white/80 hover:text-white py-2 px-4 text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Brain className="w-4 h-4" />
                    Analyse with AI
                  </button>
                </div>

                {note.aiAnalysis && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2 text-xs text-blue-400 font-medium">
                      <Sparkles className="w-3 h-3" />
                      AI Analysis Available
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredNotes.length === 0 && (
            <div className="text-center py-20">
              <div className="glass-card max-w-md mx-auto p-8">
                <FileText className="w-16 h-16 mx-auto text-white/30 mb-6" />
                <h3 className="text-xl font-semibold mb-3 text-white/90">
                  {searchQuery ? "No matching notes found" : "No notes found"}
                </h3>
                <p className="text-white/60 mb-8 leading-relaxed">
                  {searchQuery
                    ? `No notes match "${searchQuery}". Try adjusting your search terms.`
                    : databaseSetup
                      ? "Create your first note to get started"
                      : "Set up the database first, then create your first note"}
                </p>
                <Button onClick={handleCreateNote} className="new-note-button px-6 py-3">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Note
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AiChatPane
        notes={notes}
        isOpen={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        selectedNoteId={selectedNote?.id}
      />

      {showAiChat && (
        <div className="ai-chat-container">
          {isAnalysisLoading ? (
            <div className="ai-chat-bubble">
              <div className="ai-chat-header">
                <Brain className="w-5 h-5 text-blue-400 mr-2" />
                <h3 className="font-semibold text-white/95 flex-1">Analyzing: {aiChatNoteTitle}</h3>
                <button onClick={() => setShowAiChat(false)} className="p-1 hover:bg-white/10 rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3 py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent"></div>
                <span className="text-white/70">Analyzing your note...</span>
              </div>
            </div>
          ) : (
            <AiChatBubble
              initialAnalysis={aiChatContent}
              noteTitle={aiChatNoteTitle}
              onClose={() => setShowAiChat(false)}
            />
          )}
        </div>
      )}

      {isEditorOpen && (
        <div className="fullscreen-editor">
          <div className="editor-header">
            <div className="flex items-center gap-4">
              <Button onClick={handleCloseEditor} variant="ghost" size="sm" className="glass-button hover:bg-white/10">
                <X className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-semibold text-white/95">{isNewNote ? "New Note" : "Edit Note"}</h2>
              {(isSaving || hasUnsavedChanges) && (
                <div className="flex items-center gap-2 text-sm text-white/60">
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/60 border-t-transparent"></div>
                      <span>Saving...</span>
                    </>
                  ) : hasUnsavedChanges ? (
                    <span>Unsaved changes</span>
                  ) : lastSaved ? (
                    <span>Saved {lastSaved.toLocaleTimeString()}</span>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 ml-auto">
              {!isNewNote && (
                <Button
                  onClick={handleDeleteNote}
                  variant="ghost"
                  size="sm"
                  className="glass-button hover:bg-red-500/20 text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button onClick={handleSaveNote} className="new-note-button px-4 py-2" disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save (Ctrl+S)"}
              </Button>

              <button
                onClick={handleGenerateAI}
                className="ai-button"
                disabled={!editNote.content.trim() || isGeneratingAI}
                title="Generate AI Analysis (Ctrl+Enter)"
              >
                <div className="blob1"></div>
                <div className="inner">
                  <Brain className="w-4 h-4" />
                  {isGeneratingAI ? "Analyzing..." : "AI Analysis"}
                </div>
              </button>
            </div>
          </div>

          <div className="editor-content" ref={editorRef}>
            <Input
              placeholder="Note title..."
              value={editNote.title}
              onChange={(e) => handleNoteChange("title", e.target.value)}
              className="glass-input text-2xl font-bold border-0 text-white placeholder-white/40 h-16 mb-6"
            />

            <RichEditor
              content={editNote.content}
              onChange={(content) => handleNoteChange("content", content)}
              placeholder="Start writing your note..."
              className="mt-4"
            />

            {showAICard && (
              <div className="glass-card p-6 mt-6 fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <h3 className="font-semibold text-white/95">AI Analysis</h3>
                </div>

                {isGeneratingAI ? (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
                    <span className="text-white/60">Analyzing your note...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-white/70 whitespace-pre-line leading-relaxed">{aiAnalysis}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="glass-button text-blue-400 hover:text-blue-300"
                      onClick={() => {
                        setAiPanelOpen(true)
                        setShowAICard(false)
                      }}
                    >
                      Expand to Chat
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => {}} onSuccess={handleAuthSuccess} />
    </div>
  )
}

declare global {
  interface Window {
    particlesJS: any
  }
}
