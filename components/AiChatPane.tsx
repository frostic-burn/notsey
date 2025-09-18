"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { X, Send, Brain, MessageCircle, Minimize2, Maximize2, Copy, Check } from "lucide-react"
import { saveAiChat, getAiChat } from "../lib/notes"
import { generateShortAIAnalysis } from "../lib/ai"

interface Note {
  id: string
  title: string
  content: string
  aiAnalysis?: string
}

interface Message {
  role: "user" | "ai"
  content: string
  timestamp: Date
}

interface AiChatPaneProps {
  notes: Note[]
  isOpen: boolean
  onClose: () => void
  selectedNoteId?: string
}

export default function AiChatPane({ notes, isOpen, onClose, selectedNoteId }: AiChatPaneProps) {
  const [activeNoteId, setActiveNoteId] = useState<string>(selectedNoteId || notes[0]?.id || "")
  const [chatHistory, setChatHistory] = useState<Record<string, Message[]>>({})
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null)
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const activeNote = useMemo(() => notes.find((note) => note.id === activeNoteId), [notes, activeNoteId])
  const messages = useMemo(() => chatHistory[activeNoteId] || [], [chatHistory, activeNoteId])

  // Auto-scroll to bottom with smooth behavior
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [])

  // Enhanced scroll to bottom with intersection observer
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(scrollToBottom, 100)
      return () => clearTimeout(timer)
    }
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (selectedNoteId && selectedNoteId !== activeNoteId) {
      setActiveNoteId(selectedNoteId)
    }
  }, [selectedNoteId])

  useEffect(() => {
    if (activeNoteId && isOpen) {
      loadChatHistory(activeNoteId)
    }
  }, [activeNoteId, isOpen])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px"
    }
  }, [inputValue])

  // Focus input when opening
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, isMinimized, activeNoteId])

  const loadChatHistory = async (noteId: string) => {
    try {
      const existingChat = await getAiChat(noteId)
      if (existingChat && existingChat.messages) {
        setChatHistory((prev) => ({
          ...prev,
          [noteId]: existingChat.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        }))
      }
    } catch (error) {
      console.error("Error loading chat history:", error)
    }
  }

  const initializeChatForNote = async (noteId: string) => {
    if (chatHistory[noteId] && chatHistory[noteId].length > 0) return

    const note = notes.find((n) => n.id === noteId)
    if (!note) return

    setIsLoading(true)

    try {
      const analysis = await generateShortAIAnalysis(note.title, note.content)

      const aiMessage: Message = {
        role: "ai",
        content: analysis,
        timestamp: new Date(),
      }

      const newMessages = [aiMessage]
      setChatHistory((prev) => ({
        ...prev,
        [noteId]: newMessages,
      }))

      // Save to database
      await saveAiChat(noteId, newMessages, analysis, note.contentHash || "")
    } catch (error) {
      console.error("Error initializing chat:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading || !activeNote) return

    const userMessage: Message = {
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    const currentMessages = [...(chatHistory[activeNoteId] || []), userMessage]
    setChatHistory((prev) => ({
      ...prev,
      [activeNoteId]: currentMessages,
    }))

    setInputValue("")
    setIsLoading(true)

    try {
      const conversationHistory = currentMessages
        .slice(-5)
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n")
      const noteText = activeNote.content.replace(/<[^>]*>/g, "")

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": "AIzaSyBwva7OjbZMXFR_rV9CKrqcRreJ9kLK6L4",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are a supportive friend and coach discussing the note "${activeNote.title}". 
                  
                  Original note: ${noteText}
                  
                  Previous conversation:
                  ${conversationHistory}
                  
                  User: ${userMessage.content}
                  
                  Respond in a warm, empathetic, and conversational tone. Be personal and understanding.`,
                  },
                ],
              },
            ],
          }),
        },
      )

      const data = await response.json()

      if (data.candidates?.[0]?.content) {
        const aiMessage: Message = {
          role: "ai",
          content: data.candidates[0].content.parts[0].text,
          timestamp: new Date(),
        }

        const updatedMessages = [...currentMessages, aiMessage]
        setChatHistory((prev) => ({
          ...prev,
          [activeNoteId]: updatedMessages,
        }))

        // Save to database
        await saveAiChat(activeNoteId, updatedMessages, aiMessage.content, activeNote.contentHash || "")
      }
    } catch (error) {
      console.error("Error sending message:", error)
      // Add error message to chat
      const errorMessage: Message = {
        role: "ai",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }

      setChatHistory((prev) => ({
        ...prev,
        [activeNoteId]: [...currentMessages, errorMessage],
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const copyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageIndex(index)
      setTimeout(() => setCopiedMessageIndex(null), 2000)
    } catch (error) {
      console.error("Failed to copy message:", error)
    }
  }

  const clearChat = () => {
    if (window.confirm("Are you sure you want to clear this chat history?")) {
      setChatHistory((prev) => ({
        ...prev,
        [activeNoteId]: [],
      }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="ai-chat-pane">
      <div className="ai-chat-backdrop" onClick={onClose} />
      <div className={`ai-chat-container ${isMinimized ? "minimized" : ""}`}>
        {/* Sidebar */}
        <div className="ai-chat-sidebar">
          <div className="ai-chat-header">
            <Brain className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white/95">AI Chat</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="ai-chat-close-btn"
                title={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button onClick={onClose} className="ai-chat-close-btn" title="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="ai-chat-notes-list">
              {notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  className={`ai-chat-note-item ${activeNoteId === note.id ? "active" : ""}`}
                  title={note.title}
                >
                  <MessageCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{note.title || "Untitled"}</span>
                  {chatHistory[note.id] && chatHistory[note.id].length > 0 && <div className="chat-indicator" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat Area */}
        {!isMinimized && (
          <div className="ai-chat-main">
            {activeNote ? (
              <>
                <div className="ai-chat-messages" ref={chatContainerRef}>
                  {messages.length === 0 && !isLoading && (
                    <div className="ai-chat-empty">
                      <Brain className="w-8 h-8 text-white/30 mb-2" />
                      <p className="text-white/60 text-sm mb-4">Start a conversation about "{activeNote.title}"</p>
                      <button onClick={() => initializeChatForNote(activeNoteId)} className="ai-chat-start-btn">
                        Analyze Note
                      </button>
                    </div>
                  )}

                  {messages.map((message, index) => (
                    <div key={index} className={`ai-chat-message ${message.role} group`}>
                      <div className="message-content">{message.content}</div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="message-time">
                          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <button
                          onClick={() => copyMessage(message.content, index)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
                          title="Copy message"
                        >
                          {copiedMessageIndex === index ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-white/60" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="ai-chat-message ai loading">
                      <div className="message-content">
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="ai-chat-input-area">
                  <div className="flex flex-col gap-2">
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask about this note... (Enter to send, Shift+Enter for new line)"
                      className="ai-chat-input resize-none"
                      disabled={isLoading}
                      rows={1}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {messages.length > 0 && (
                          <button
                            onClick={clearChat}
                            className="text-xs text-white/50 hover:text-white/80 transition-colors"
                          >
                            Clear Chat
                          </button>
                        )}
                      </div>
                      <button
                        onClick={sendMessage}
                        disabled={!inputValue.trim() || isLoading}
                        className="ai-chat-send-btn"
                        title="Send message (Enter)"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="ai-chat-no-note">
                <Brain className="w-12 h-12 text-white/30 mb-4" />
                <p className="text-white/60">Select a note to start chatting</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
