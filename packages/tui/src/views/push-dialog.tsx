// packages/tui/src/views/push-dialog.tsx
import { useState } from "react"
import { useKeyboard } from "@opentui/react"
import { colors } from "../utils/colors.js"
import type { RemoteServer } from "../db/servers.js"
import { planPush, applyPush } from "../db/push.js"
import type { PushPreview, PushResult } from "../db/push.js"

interface PushDialogProps {
  server: RemoteServer
  onClose: (result?: PushResult) => void
}

type Stage = "choose" | "previewing" | "review" | "applying" | "done" | "error"

/**
 * TUI push dialog. State machine: choose -> previewing -> review -> applying -> done | error.
 * Keybindings:
 *   m      toggle Mirror mode (in choose)
 *   Enter  advance (choose->preview, review->apply if changes exist)
 *   Esc    cancel / go back
 */
export function PushDialog({ server, onClose }: PushDialogProps) {
  const [mirror, setMirror] = useState(false)
  const [stage, setStage] = useState<Stage>("choose")
  const [preview, setPreview] = useState<PushPreview | null>(null)
  const [result, setResult] = useState<PushResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const totalChanges =
    (preview?.toAdd.length ?? 0) +
    (preview?.toUpdate.length ?? 0) +
    (preview?.toDelete.length ?? 0)

  useKeyboard((key) => {
    if (stage === "previewing" || stage === "applying") return // no input while running

    if (key.name === "escape") {
      if (stage === "review") {
        // Go back to choose
        setStage("choose")
        setPreview(null)
        return
      }
      onClose()
      return
    }

    if (stage === "choose") {
      if (key.name === "m") {
        setMirror((v) => !v)
        return
      }
      if (key.name === "return") {
        runPreview()
        return
      }
    }

    if (stage === "review") {
      if (key.name === "return" && totalChanges > 0) {
        runApply()
        return
      }
    }

    if (stage === "done" || stage === "error") {
      if (key.name === "return" || key.name === "escape") {
        onClose(result ?? undefined)
        return
      }
    }
  })

  async function runPreview() {
    setStage("previewing")
    setError(null)
    try {
      const p = await planPush(server, { mirror })
      setPreview(p)
      setStage("review")
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStage("error")
    }
  }

  async function runApply() {
    if (!preview) return
    setStage("applying")
    setError(null)
    try {
      const r = await applyPush(server, preview)
      setResult(r)
      setStage("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStage("error")
    }
  }

  return (
    <box
      style={{
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.bg,
      }}
    >
      <box
        style={{
          width: 72,
          border: true,
          borderColor: colors.primary,
          backgroundColor: "#1a1a2e",
          paddingLeft: 2,
          paddingRight: 2,
          paddingTop: 1,
          paddingBottom: 1,
          flexDirection: "column",
        }}
        title={`Push to ${server.label}`}
      >
        {stage === "choose" && (
          <>
            <text fg={colors.primary}>
              <strong>Push to {server.label}</strong>
            </text>
            <text>{" "}</text>
            <text fg={mirror ? colors.textDim : colors.success}>
              {mirror ? "  " : "> "}[Push] additive — adds/updates only, never deletes
            </text>
            <text fg={mirror ? colors.warning : colors.textDim}>
              {mirror ? "> " : "  "}[Mirror] one-to-one — also deletes remote-only skills
            </text>
            <text>{" "}</text>
            <text fg={colors.textDim}>
              m=toggle mode  Enter=preview  Esc=cancel
            </text>
          </>
        )}

        {stage === "previewing" && (
          <>
            <text fg={colors.textDim}>Computing diff...</text>
          </>
        )}

        {stage === "review" && preview && (
          <>
            <text fg={colors.primary}>
              <strong>Preview</strong>
              {preview.mirror ? (
                <span fg={colors.warning}> (Mirror mode)</span>
              ) : null}
            </text>
            <text>{" "}</text>
            <text fg={colors.text}>
              <span fg={colors.success}>{preview.toAdd.length} to add</span>
              {"  "}
              <span fg={colors.warning}>{preview.toUpdate.length} to update</span>
              {preview.mirror ? (
                <>
                  {"  "}
                  <span fg={colors.error}>{preview.toDelete.length} to delete</span>
                </>
              ) : null}
              {"  "}
              <span fg={colors.textDim}>{preview.unchanged.length} unchanged</span>
            </text>
            <text>{" "}</text>
            {totalChanges === 0 ? (
              <text fg={colors.textDim}>Nothing to push — remote already matches local.</text>
            ) : (
              <>
                {preview.toAdd.map((e, i) => (
                  <text key={`add-${i}`} fg={colors.success}>+ {e.folderName}</text>
                ))}
                {preview.toUpdate.map((e, i) => (
                  <text key={`upd-${i}`} fg={colors.warning}>~ {e.folderName}</text>
                ))}
                {preview.toDelete.map((e, i) => (
                  <text key={`del-${i}`} fg={colors.error}>- {e.folderName}</text>
                ))}
              </>
            )}
            {preview.mirror && preview.toDelete.length > 0 && (
              <>
                <text>{" "}</text>
                <text fg={colors.error}>
                  Mirror will delete {preview.toDelete.length} skill{preview.toDelete.length === 1 ? "" : "s"} from remote.
                </text>
              </>
            )}
            <text>{" "}</text>
            <text fg={colors.textDim}>
              {totalChanges > 0
                ? preview.mirror && preview.toDelete.length > 0
                  ? "Enter=confirm mirror (destructive)  Esc=back"
                  : "Enter=apply  Esc=back"
                : "Esc=close"}
            </text>
          </>
        )}

        {stage === "applying" && (
          <text fg={colors.textDim}>Pushing to remote...</text>
        )}

        {stage === "done" && result && (
          <>
            <text fg={colors.success}><strong>Push complete</strong></text>
            <text>{" "}</text>
            <text fg={colors.text}>
              <span fg={colors.success}>{result.added} added</span>
              {"  "}
              <span fg={colors.warning}>{result.updated} updated</span>
              {"  "}
              <span fg={result.deleted > 0 ? colors.error : colors.textDim}>{result.deleted} deleted</span>
              {"  "}
              <span fg={colors.textDim}>{result.unchanged} unchanged</span>
            </text>
            {result.errors.length > 0 && (
              <>
                <text>{" "}</text>
                <text fg={colors.error}>Errors ({result.errors.length}):</text>
                {result.errors.map((e, i) => (
                  <text key={i} fg={colors.error}>  {e.folderName}: {e.message}</text>
                ))}
              </>
            )}
            <text>{" "}</text>
            <text fg={colors.textDim}>Enter or Esc to close</text>
          </>
        )}

        {stage === "error" && (
          <>
            <text fg={colors.error}><strong>Push failed</strong></text>
            <text>{" "}</text>
            <text fg={colors.error}>{error || "Unknown error"}</text>
            <text>{" "}</text>
            <text fg={colors.textDim}>Enter or Esc to close</text>
          </>
        )}
      </box>
    </box>
  )
}
