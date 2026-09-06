import { useEffect, useState } from "react"
import { electronAPI } from "../lib/electron-api"

export function ScanSourcesDialog({
  open,
  onClose,
  onRescan,
}: {
  open: boolean
  onClose: () => void
  onRescan: () => Promise<void>
}) {
  const [paths, setPaths] = useState<string[]>([])
  const [newPath, setNewPath] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    electronAPI
      .settingsGet("scan.customPaths", [] as string[])
      .then((value) => setPaths(Array.isArray(value) ? value : []))
      .catch(() => setPaths([]))
  }, [open])

  if (!open) return null

  const addPath = () => {
    const value = newPath.trim()
    if (!value || paths.includes(value)) return
    setPaths((current) => [...current, value])
    setNewPath("")
  }

  const saveAndScan = async () => {
    setSaving(true)
    try {
      await electronAPI.settingsSet("scan.customPaths", paths)
      await onRescan()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-5">
      <div className="w-full max-w-xl rounded-xl border border-border bg-surface p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-semibold text-foreground">自定义扫描目录</h2>
            <p className="mt-1 text-[12px] leading-5 text-muted">
              添加本地文件夹后，SkillVault 会扫描其中的 SKILL.md 和项目级 Agent 目录。
            </p>
          </div>
          <button onClick={onClose} className="skillvault-detail-close" aria-label="关闭">×</button>
        </div>

        <div className="mb-4 flex gap-2">
          <input
            value={newPath}
            onChange={(event) => setNewPath(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addPath()
            }}
            placeholder="D:\\Projects 或 ~/my-skills"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-[12px] text-foreground"
          />
          <button onClick={addPath} className="rounded-lg border border-border px-4 text-[12px] text-foreground hover:bg-surface-hover">
            添加
          </button>
        </div>

        <div className="max-h-64 space-y-2 overflow-y-auto">
          {paths.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-7 text-center text-[12px] text-muted">
              暂无自定义目录，Agent 的默认目录仍会自动扫描。
            </div>
          ) : (
            paths.map((scanPath) => (
              <div key={scanPath} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
                <code className="min-w-0 flex-1 truncate text-[12px] text-foreground">{scanPath}</code>
                <button
                  onClick={() => setPaths((current) => current.filter((item) => item !== scanPath))}
                  className="text-[12px] text-muted hover:text-red-500"
                >
                  移除
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-[12px] text-muted hover:text-foreground">取消</button>
          <button
            onClick={() => void saveAndScan()}
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            {saving ? "扫描中…" : "保存并扫描"}
          </button>
        </div>
      </div>
    </div>
  )
}
