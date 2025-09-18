"use client"

import type React from "react"
import { TextStyle } from '@tiptap/extension-text-style'; // ✅ CORRECT
import { useEffect, useRef, useState } from "react"
import {
  Bold,
  Italic,
  Underline,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link,
  ImageIcon,
  Code,
} from "lucide-react"

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
}

export default function RichTextEditor({ content, onChange, placeholder, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isToolbarVisible, setIsToolbarVisible] = useState(true)

  const colors = [
    "#ffffff",
    "#ff6b6b",
    "#4ecdc4",
    "#45b7d1",
    "#96ceb4",
    "#ffeaa7",
    "#dda0dd",
    "#98d8c8",
    "#f7dc6f",
    "#bb8fce",
  ]

  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = content
    }
  }, [content])

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }

  const insertHTML = (html: string) => {
    document.execCommand("insertHTML", false, html)
    editorRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "b":
          e.preventDefault()
          executeCommand("bold")
          break
        case "i":
          e.preventDefault()
          executeCommand("italic")
          break
        case "u":
          e.preventDefault()
          executeCommand("underline")
          break
      }
    }
  }

  return (
    <div className={`rich-text-editor ${className}`}>
      {/* Rich Text Toolbar */}
      <div className="editor-toolbar">
        {/* Text Formatting */}
        <button className="toolbar-button" onClick={() => executeCommand("bold")} title="Bold (Ctrl+B)">
          <Bold className="w-4 h-4" />
        </button>
        <button className="toolbar-button" onClick={() => executeCommand("italic")} title="Italic (Ctrl+I)">
          <Italic className="w-4 h-4" />
        </button>
        <button className="toolbar-button" onClick={() => executeCommand("underline")} title="Underline (Ctrl+U)">
          <Underline className="w-4 h-4" />
        </button>

        <div className="toolbar-separator"></div>

        {/* Headings */}
        <select
          className="toolbar-select"
          onChange={(e) => executeCommand("formatBlock", e.target.value)}
          defaultValue=""
        >
          <option value="">Normal</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="p">Paragraph</option>
        </select>

        <div className="toolbar-separator"></div>

        {/* Alignment */}
        <button className="toolbar-button" onClick={() => executeCommand("justifyLeft")} title="Align Left">
          <AlignLeft className="w-4 h-4" />
        </button>
        <button className="toolbar-button" onClick={() => executeCommand("justifyCenter")} title="Align Center">
          <AlignCenter className="w-4 h-4" />
        </button>
        <button className="toolbar-button" onClick={() => executeCommand("justifyRight")} title="Align Right">
          <AlignRight className="w-4 h-4" />
        </button>

        <div className="toolbar-separator"></div>

        {/* Lists */}
        <button className="toolbar-button" onClick={() => executeCommand("insertUnorderedList")} title="Bullet List">
          <List className="w-4 h-4" />
        </button>
        <button className="toolbar-button" onClick={() => executeCommand("insertOrderedList")} title="Numbered List">
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="toolbar-separator"></div>

        {/* Color Picker */}
        <div className="color-picker">
          <Type className="w-4 h-4 text-white/60 mr-2" />
          {colors.map((color) => (
            <div
              key={color}
              className="color-option"
              style={{ backgroundColor: color }}
              onClick={() => executeCommand("foreColor", color)}
              title={`Text Color: ${color}`}
            />
          ))}
        </div>

        <div className="toolbar-separator"></div>

        {/* Additional Tools */}
        <button
          className="toolbar-button"
          onClick={() => {
            const url = prompt("Enter link URL:")
            if (url) executeCommand("createLink", url)
          }}
          title="Insert Link"
        >
          <Link className="w-4 h-4" />
        </button>
        <button className="toolbar-button" onClick={() => executeCommand("insertHorizontalRule")} title="Insert Line">
          —
        </button>
        <button className="toolbar-button" onClick={() => executeCommand("removeFormat")} title="Clear Formatting">
          <Code className="w-4 h-4" />
        </button>
        <button className="toolbar-button" onClick={() => executeCommand("insertImage")} title="Insert Image">
          <ImageIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Content */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className="rich-text-content"
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />
    </div>
  )
}
