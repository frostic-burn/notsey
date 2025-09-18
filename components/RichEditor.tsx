"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import { TextStyle } from "@tiptap/extension-text-style"
import Color from "@tiptap/extension-color"
import Image from "@tiptap/extension-image"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Type,
  ImageIcon,
  Undo,
  Redo,
} from "lucide-react"

interface RichEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
}

export default function RichEditor({ content, onChange, placeholder, className }: RichEditorProps) {
  const [isToolbarSticky, setIsToolbarSticky] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [characterCount, setCharacterCount] = useState(0)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const updateTimeoutRef = useRef<NodeJS.Timeout>()

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        history: {
          depth: 100,
          newGroupDelay: 500,
        },
      }),
      Underline,
      TextStyle,
      Color,
      Image.configure({
        HTMLAttributes: {
          class: "rich-editor-image",
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      // Debounced onChange to improve performance
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }

      updateTimeoutRef.current = setTimeout(() => {
        const newContent = editor.getHTML()
        if (newContent !== content) {
          onChange(newContent)

          // Update word and character counts
          const text = editor.getText()
          setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0)
          setCharacterCount(text.length)
        }
      }, 150)
    },
    editorProps: {
      attributes: {
        class: "rich-editor-content focus:outline-none",
        "data-placeholder": placeholder || "",
        spellcheck: "true",
      },
      handleKeyDown: (view, event) => {
        // Enhanced keyboard shortcuts
        if (event.ctrlKey || event.metaKey) {
          switch (event.key) {
            case "z":
              if (event.shiftKey) {
                event.preventDefault()
                editor?.chain().focus().redo().run()
                return true
              } else {
                event.preventDefault()
                editor?.chain().focus().undo().run()
                return true
              }
            case "y":
              event.preventDefault()
              editor?.chain().focus().redo().run()
              return true
          }
        }
        return false
      },
    },
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
  })

  // Sticky toolbar functionality
  useEffect(() => {
    const handleScroll = () => {
      if (toolbarRef.current && editorContainerRef.current) {
        const rect = editorContainerRef.current.getBoundingClientRect()
        const shouldStick = rect.top < 100 && rect.bottom > 200
        setIsToolbarSticky(shouldStick)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Content synchronization with better performance
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      const currentContent = editor.getHTML()
      if (currentContent !== content) {
        editor.commands.setContent(content, false, { preserveWhitespace: "full" })

        // Update counts
        const text = editor.getText()
        setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0)
        setCharacterCount(text.length)
      }
    }
  }, [content, editor])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [])

  const addImage = useCallback(() => {
    const url = window.prompt("Enter image URL:")
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  const setColor = useCallback(
    (color: string) => {
      if (editor) {
        editor.chain().focus().setColor(color).run()
      }
    },
    [editor],
  )

  const insertTable = useCallback(() => {
    if (editor) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    }
  }, [editor])

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

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/60 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className={`rich-editor ${className}`} ref={editorContainerRef}>
      {/* Enhanced Toolbar */}
      <div ref={toolbarRef} className={`rich-editor-toolbar ${isToolbarSticky ? "sticky top-20 z-30 shadow-lg" : ""}`}>
        {/* Text Formatting */}
        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="toolbar-btn"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="toolbar-btn"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`toolbar-btn ${editor.isActive("bold") ? "active" : ""}`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`toolbar-btn ${editor.isActive("italic") ? "active" : ""}`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`toolbar-btn ${editor.isActive("underline") ? "active" : ""}`}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`toolbar-btn ${editor.isActive("strike") ? "active" : ""}`}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
        </div>

        <div className="toolbar-separator" />

        {/* Headings */}
        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`toolbar-btn ${editor.isActive("heading", { level: 1 }) ? "active" : ""}`}
            title="Heading 1"
          >
            H1
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`toolbar-btn ${editor.isActive("heading", { level: 2 }) ? "active" : ""}`}
            title="Heading 2"
          >
            H2
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`toolbar-btn ${editor.isActive("heading", { level: 3 }) ? "active" : ""}`}
            title="Heading 3"
          >
            H3
          </button>

          <button
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={`toolbar-btn ${editor.isActive("paragraph") ? "active" : ""}`}
            title="Paragraph"
          >
            P
          </button>
        </div>

        <div className="toolbar-separator" />

        {/* Lists */}
        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`toolbar-btn ${editor.isActive("bulletList") ? "active" : ""}`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`toolbar-btn ${editor.isActive("orderedList") ? "active" : ""}`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
        </div>

        <div className="toolbar-separator" />

        {/* Colors */}
        <div className="color-picker-group">
          <Type className="w-4 h-4 text-white/60 mr-2" />
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => setColor(color)}
              className={`color-btn ${editor.isActive("textStyle", { color }) ? "ring-2 ring-white/50" : ""}`}
              style={{ backgroundColor: color }}
              title={`Text Color: ${color}`}
            />
          ))}
        </div>

        <div className="toolbar-separator" />

        {/* Media */}
        <div className="toolbar-group">
          <button onClick={addImage} className="toolbar-btn" title="Insert Image">
            <ImageIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Status Bar */}
      <div className="editor-status-bar">
        <div className="flex items-center gap-4 text-xs text-white/50">
          <span>{wordCount} words</span>
          <span>{characterCount} characters</span>
          {editor.isActive("heading") && (
            <span className="text-blue-400">
              {editor.isActive("heading", { level: 1 }) && "H1"}
              {editor.isActive("heading", { level: 2 }) && "H2"}
              {editor.isActive("heading", { level: 3 }) && "H3"}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
