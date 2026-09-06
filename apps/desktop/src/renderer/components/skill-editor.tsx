import {
  forwardRef,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  useMemo,
} from "react"
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import { markdown } from "@codemirror/lang-markdown"
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { searchKeymap } from "@codemirror/search"

const LARGE_DOCUMENT_CHAR_THRESHOLD = 30_000
const LARGE_DOCUMENT_LINE_THRESHOLD = 800

function createTheme(fullBleed: boolean) {
  return EditorView.theme({
  "&": {
    fontSize: "14px",
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
    backgroundColor: "var(--code-bg)",
    color: "var(--foreground)",
    borderRadius: fullBleed ? "0" : "8px",
    border: fullBleed ? "none" : "1px solid var(--color-border, #262626)",
    overflow: "hidden",
    height: "100%",
  },
  ".cm-content": {
    padding: "12px 0",
    lineHeight: "22px",
    caretColor: "var(--foreground)",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--foreground)",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(139, 166, 184, 0.08)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--code-bg)",
    color: "var(--muted)",
    border: "none",
  },
  ".cm-activeLineGutter": {
    color: "var(--muted)",
    backgroundColor: "transparent",
  },
  ".cm-selectionBackground, ::selection": {
    backgroundColor: "rgba(78, 110, 118, 0.28) !important",
  },
  ".cm-scroller": {
    overflow: "auto",
    overscrollBehavior: "contain",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(78, 110, 118, 0.28) !important",
  },
  "&.cm-focused": {
    outline: "none",
  },
}, { dark: true })
}

interface SkillEditorProps {
  content: string
  onChange?: (content: string) => void
  onSave: (content: string) => void
  fullBleed?: boolean
}

export interface SkillEditorHandle {
  getValue: () => string
  focus: () => void
}

export const SkillEditor = forwardRef<SkillEditorHandle, SkillEditorProps>(function SkillEditor(
  { content, onChange, onSave, fullBleed = false }: SkillEditorProps,
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const onSaveRef = useRef(onSave)

  onChangeRef.current = onChange
  onSaveRef.current = onSave
  const isLargeDocument = useMemo(() => {
    if (content.length >= LARGE_DOCUMENT_CHAR_THRESHOLD) {
      return true
    }
    return content.split("\n").length >= LARGE_DOCUMENT_LINE_THRESHOLD
  }, [content])
  const theme = useMemo(() => createTheme(fullBleed), [fullBleed])

  useImperativeHandle(ref, () => ({
    getValue: () => viewRef.current?.state.doc.toString() ?? content,
    focus: () => viewRef.current?.focus(),
  }), [content])

  const saveKeymap = useCallback(() => keymap.of([{
    key: "Mod-s",
    run: () => {
      const currentContent = viewRef.current?.state.doc.toString() ?? ""
      onSaveRef.current(currentContent)
      return true
    },
  }]), [])

  useEffect(() => {
    if (!containerRef.current) return

    const extensions = [
      EditorView.contentAttributes.of({
        spellcheck: "false",
        autocorrect: "off",
        autocapitalize: "off",
        "data-gramm": "false",
      }),
      EditorView.lineWrapping,
      lineNumbers(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
      saveKeymap(),
      theme,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current?.(update.state.doc.toString())
        }
      }),
    ]

    if (!isLargeDocument) {
      extensions.splice(1, 0, highlightActiveLine(), highlightActiveLineGutter())
      extensions.push(markdown(), syntaxHighlighting(defaultHighlightStyle, { fallback: true }))
    }

    const state = EditorState.create({
      doc: content,
      extensions,
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, isLargeDocument, theme])

  // Sync external content changes
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    if (view.state.doc.toString() !== content) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content,
        },
      })
    }
  }, [content])

  return (
    <div
      ref={containerRef}
      className="h-full"
    />
  )
})
