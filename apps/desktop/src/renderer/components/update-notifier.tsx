import { useEffect, useRef, useState } from "react"
import { marked } from "marked"
import { electronAPI } from "../lib/electron-api"
import {
  buildUpdateNotesViewModel,
  UP_TO_DATE_MESSAGE,
  type UpdateNotesSection,
  type UpdateReleaseNotes,
} from "../../shared/update-notes"

marked.setOptions({ async: false, breaks: true, gfm: true })

function sanitizeHtml(html: string): string {
  let clean = html.replace(
    /<(script|iframe|object|embed|form|style)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi,
    "",
  )
  clean = clean.replace(/<(script|iframe|object|embed|link)\b[^>]*\/?>/gi, "")
  clean = clean.replace(/\s+on\w+\s*=\s*["']?[^"'>\s]*["']?/gi, "")
  clean = clean.replace(/href\s*=\s*["']?\s*javascript:/gi, 'href="')
  clean = clean.replace(/src\s*=\s*["']?\s*javascript:/gi, 'src="')
  return clean
}

interface ReleaseNotesPayload {
  current: UpdateReleaseNotes | null
  latest: UpdateReleaseNotes | null
}

function UpdateIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function versionText(version: string | undefined): string {
  if (!version) return ""
  return version.startsWith("v") ? version : `v${version}`
}

function formatPublishedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand("copy")
    textarea.remove()
    return copied
  }
}

function UpdateNotesBlock({
  section,
  loading,
}: {
  section: UpdateNotesSection
  loading: boolean
}) {
  if (loading) {
    return <p className="mt-2 text-[12px] text-muted">正在载入更新内容…</p>
  }
  if (section.kind === "up-to-date") {
    return (
      <div className="mt-2.5 rounded-[10px] border border-accent/40 bg-accent/5 px-4 py-3.5">
        <p className="text-[13px] font-medium leading-6 text-foreground">{section.message}</p>
      </div>
    )
  }
  if (section.kind === "empty") {
    return <p className="mt-2 text-[12px] leading-5 text-muted">{section.message}</p>
  }
  const publishedAt = section.publishedAt ? formatPublishedAt(section.publishedAt) : ""
  return (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
        {publishedAt && <span>发布于 {publishedAt}</span>}
        {section.url && (
          <a
            href={section.url}
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            查看 Release
          </a>
        )}
      </div>
      <div
        className="skillbox-release-notes skillbox-release-notes--compact mt-2.5 max-h-44 overflow-y-auto text-[12px] text-foreground"
        dangerouslySetInnerHTML={{
          __html: sanitizeHtml(marked.parse(section.body) as string),
        }}
      />
    </>
  )
}

export function UpdateNotifier() {
  const [state, setState] = useState<UpdateState | null>(null)
  const [appVersion, setAppVersion] = useState("")
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState<ReleaseNotesPayload | null>(null)
  const [notesLoading, setNotesLoading] = useState(false)
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle")
  const announcedVersion = useRef("")
  const notesRequested = useRef(false)

  useEffect(() => {
    electronAPI.updatesGetState().then(setState).catch(() => {})
    electronAPI.appGetVersion().then(setAppVersion).catch(() => {})
    return electronAPI.onUpdateState(setState)
  }, [])

  const hasUpdate =
    state?.status === "available" ||
    state?.status === "downloading" ||
    state?.status === "downloaded"

  const view = buildUpdateNotesViewModel({
    appVersion,
    state,
    currentNotes: notes?.current ?? null,
    latestNotes: notes?.latest ?? null,
  })
  const targetVersion =
    state?.downloadedVersion ||
    state?.availableVersion ||
    view.latestVersion ||
    notes?.latest?.version

  useEffect(() => {
    if (!hasUpdate || !targetVersion || announcedVersion.current === targetVersion) return
    announcedVersion.current = targetVersion
    setOpen(true)
  }, [hasUpdate, targetVersion])

  // 弹窗打开时同时取「当前版本 / 最新版本」两份更新介绍；已是最新版本时也要能看当前版本说明
  useEffect(() => {
    if (!open || notesRequested.current) return
    notesRequested.current = true
    setNotesLoading(true)
    electronAPI
      .updatesReleaseNotes()
      .then((result) => setNotes(result))
      .catch(() => setNotes(null))
      .finally(() => setNotesLoading(false))
  }, [open])

  const releaseUrl =
    notes?.latest?.url ||
    (targetVersion
      ? `https://github.com/huangluke89757/SkillVault/releases/tag/v${targetVersion}`
      : "https://github.com/huangluke89757/SkillVault/releases")

  const handleCopyUpdateRequest = async () => {
    if (!targetVersion) return
    const prompt = `请把本机已安装的 SkillVault 更新至 ${versionText(targetVersion)}。当前对话无需位于 SkillVault 项目目录，请直接从官方 Release 下载并安装：${releaseUrl}。更新时保留现有 Skill、Agent 适配关系和独立副本；完成后启动 SkillVault，确认版本为 ${versionText(targetVersion)} 且原有数据仍在。`
    const copied = await copyText(prompt)
    setCopyStatus(copied ? "success" : "error")
    window.setTimeout(() => setCopyStatus("idle"), 1800)
  }

  const handlePrimaryAction = async () => {
    if (state?.status === "available") {
      setState(await electronAPI.updatesDownload())
      return
    }
    if (state?.status === "downloaded") {
      await electronAPI.updatesInstall()
      return
    }
    setState(await electronAPI.updatesCheck())
  }

  const primaryLabel = (() => {
    if (state?.status === "checking") return "检查中…"
    if (view.isUpToDate) return "检查更新"
    if (state?.status === "available") return "立即下载更新"
    if (state?.status === "downloading") {
      return `下载中 ${Math.round(state.progressPercent ?? 0)}%`
    }
    if (state?.status === "downloaded") return "重启并安装"
    return "检查更新"
  })()

  return (
    <>
      <button
        type="button"
        className={`skillbox-update-button ${hasUpdate ? "has-update" : ""}`}
        title={hasUpdate ? `新版本 ${versionText(targetVersion)} 可用` : "检查更新"}
        aria-label={hasUpdate ? `新版本 ${versionText(targetVersion)} 可用` : "检查更新"}
        onClick={() => setOpen(true)}
      >
        <UpdateIcon />
        {hasUpdate && <i className="skillbox-update-dot" />}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-5"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[570px] overflow-y-auto rounded-2xl border border-border bg-surface shadow-xl"
            style={{ maxHeight: "calc(100vh - 48px)" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="skillbox-update-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-5 border-b border-border px-6 py-5">
              <div>
                <p className="text-[11px] font-semibold text-accent">版本更新</p>
                <h2
                  id="skillbox-update-title"
                  className="mt-2 text-[21px] font-semibold leading-tight text-foreground"
                >
                  {view.isUpToDate
                    ? "SkillVault 已是最新版本"
                    : `SkillVault ${versionText(targetVersion) || "更新"}`}
                </h2>
                <p className="mt-1.5 text-[11px] text-muted">
                  当前版本 {versionText(view.currentVersion) || "…"}
                  {view.latestVersion && !view.isUpToDate
                    ? ` · 最新版本 ${versionText(view.latestVersion)}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="skillbox-detail-close"
                aria-label="关闭更新通知"
              >
                ×
              </button>
            </header>

            <div className="space-y-5 px-6 pb-1 pt-5">
              <section>
                <h3 className="text-[13px] font-semibold leading-6 text-foreground">
                  当前版本 {versionText(view.currentVersion)} · 更新介绍
                </h3>
                <UpdateNotesBlock section={view.current} loading={notesLoading && !notes} />
              </section>

              <section className="border-t border-border pt-4">
                <h3 className="text-[13px] font-semibold leading-6 text-foreground">
                  {view.isUpToDate
                    ? "最新版本"
                    : `最新版本 ${versionText(view.latestVersion)} · 更新介绍`}
                </h3>
                <UpdateNotesBlock section={view.latest} loading={notesLoading && !notes} />
              </section>
            </div>

            <div className="mx-6 mt-4 rounded-[10px] border border-border bg-background px-3 py-2.5">
              {state?.status === "downloading" ? (
                <div>
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-foreground">
                      正在下载 SkillVault {versionText(targetVersion)}…
                    </span>
                    <span className="whitespace-nowrap text-muted">
                      {Math.round(state.progressPercent ?? 0)}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-hover">
                    <div
                      className="h-full rounded-full bg-accent transition-[width]"
                      style={{ width: `${Math.round(state.progressPercent ?? 0)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-foreground">
                    {state?.status === "available" &&
                      `${versionText(targetVersion)} 已准备就绪，可立即下载。`}
                    {state?.status === "downloaded" &&
                      `${versionText(targetVersion)} 已下载完成，重启后即可生效。`}
                    {state?.status === "checking" && "正在检查更新…"}
                    {state?.status === "not-available" && UP_TO_DATE_MESSAGE}
                    {state?.status === "error" &&
                      `检查更新失败：${state.message ?? "请稍后重试"}`}
                    {(!state || state.status === "idle") &&
                      "启动时会自动检查更新，也可以手动检查。"}
                  </span>
                  <span className="whitespace-nowrap text-muted">
                    {state?.status === "available" && "等待下载"}
                    {state?.status === "downloaded" && "下载完成"}
                  </span>
                </div>
              )}
            </div>

            <footer className="flex items-end justify-between gap-4 px-6 pb-5 pt-4">
              <p className="max-w-[220px] text-[10px] leading-[1.55] text-muted">
                更新不会更改现有 Skill、Agent 适配关系或独立副本。
              </p>
              <div className="flex shrink-0 gap-2">
                {view.showUpdateActions && targetVersion && (
                  <button
                    type="button"
                    onClick={() => void handleCopyUpdateRequest()}
                    className="min-h-11 whitespace-nowrap rounded-[10px] border border-border px-3.5 text-[12px] font-medium text-foreground outline-2 outline-offset-2 hover:bg-surface-hover focus-visible:outline-accent active:translate-y-px"
                  >
                    {copyStatus === "success"
                      ? "更新请求已复制"
                      : copyStatus === "error"
                        ? "复制失败，请重试"
                        : "复制给 Agent 更新"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handlePrimaryAction()}
                  disabled={state?.status === "checking" || state?.status === "downloading"}
                  className="min-h-11 whitespace-nowrap rounded-[10px] border border-accent bg-accent px-4 text-[12px] font-semibold text-white outline-2 outline-offset-2 hover:brightness-95 focus-visible:outline-accent active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {primaryLabel}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
