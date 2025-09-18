"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Brain, Send, X, ChevronDown, ChevronUp } from "lucide-react"

interface Message {
  role: "user" | "ai"
  content: string
}

interface AiChatBubbleProps {
  initialAnalysis: string
  noteTitle: string
  onClose: () => void
}

export default function AiChatBubble({ initialAnalysis, noteTitle, onClose }: AiChatBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content: initialAnalysis,
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue("")

    // Add user message to chat
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])

    // Scroll to bottom after state update
    setTimeout(scrollToBottom, 100)

    setIsLoading(true)

    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": "APIXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are analyzing a note titled "${noteTitle}". 
                    Previous conversation: ${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}
                    
                    User: ${userMessage}`,
                  },
                ],
              },
            ],
          }),
        },
      )

      const data = await response.json()

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        setMessages((prev) => [...prev, { role: "ai", content: data.candidates[0].content.parts[0].text }])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: "I'm sorry, I couldn't process that request. Please try again." },
        ])
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "Sorry, there was an error processing your request. Please try again." },
      ])
    } finally {
      setIsLoading(false)
      // Scroll to bottom after new message
      setTimeout(scrollToBottom, 100)
    }
  }

  return (
    <div className={`ai-chat-bubble ${isExpanded ? "expanded" : "collapsed"}`}>
      <div className="ai-chat-header">
        <Brain className="w-5 h-5 text-blue-400 mr-2" />
        <h3 className="font-semibold text-white/95 flex-1">AI Analysis: {noteTitle}</h3>
        <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 hover:bg-white/10 rounded-full">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full ml-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="ai-chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={message.role === "user" ? "ai-chat-user-message" : "ai-chat-ai-message"}>
            {message.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="ai-chat-form">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a follow-up question..."
            className="ai-chat-input pr-12"
            disabled={isLoading}
          />
          <button type="submit" className="ai-chat-send" disabled={isLoading || !inputValue.trim()}>
            {isLoading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full" />
            ) : (
              <Send className="w-4 h-4 text-white/80" />
            )}
          </button>
        </form>
      )}
    </div>
  )
}
