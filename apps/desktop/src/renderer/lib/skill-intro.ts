// 详情页「中文简介」支撑：从 SKILL.md 提取标题与描述，管理翻译结果的本地缓存。
// 翻译本体走主进程 IPC（skills:translate-text），本文件只做提取与缓存。

export interface SkillIntro {
  name: string
  description: string
}

// 粗略哈希（仅作缓存键，不用于安全场景）
export function hashKey(text: string): string {
  let h = 5381
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

// 逐行解析 front matter 字段；支持单行值与 | / > 折叠块
function parseFrontMatterField(frontMatter: string, field: string): string | null {
  const lines = frontMatter.split(/\r?\n/)
  const header = new RegExp(`^${field}:\\s*(.*)$`)
  let collecting = false
  const collected: string[] = []
  for (const line of lines) {
    const match = line.match(header)
    if (match && !collecting) {
      collecting = true
      const inline = match[1].trim().replace(/^["']|["']$/g, "")
      if (inline && !/^[|>]-?$/.test(inline)) return inline
      continue
    }
    if (collecting) {
      if (/^\S/.test(line)) break
      collected.push(line.trim())
    }
  }
  const joined = collected.join(" ").trim()
  return joined || null
}

// 简介只取前 ~300 字符：翻译耗时与长度成正比，够用即可（按句断开，避免半句）
const INTRO_MAX_CHARS = 300

function truncateAtSentence(text: string, limit: number): string {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= limit) return clean
  const window = clean.slice(0, limit)
  const cut = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
    window.lastIndexOf("。"),
  )
  return (cut >= limit * 0.4 ? window.slice(0, cut + 1) : window.trimEnd() + "…").trim()
}

/** 从 SKILL.md 提取名称与描述；失败返回 null */
export function extractIntro(content: string, fallbackName: string): SkillIntro | null {
  if (!content) return null

  let name = fallbackName
  let description = ""

  const frontMatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (frontMatterMatch) {
    const frontMatter = frontMatterMatch[1]
    const nameField = parseFrontMatterField(frontMatter, "name")
    if (nameField) name = nameField
    const descField = parseFrontMatterField(frontMatter, "description")
    if (descField) description = descField.replace(/\s+/g, " ")
  }

  // 兜底：正文第一个非标题段落
  if (!description) {
    const body = content.replace(/^---[\s\S]*?---/, "").trim()
    const paragraph = body
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .find(
        (part) =>
          part &&
          !part.startsWith("#") &&
          !part.startsWith("---") &&
          !part.startsWith("```") &&
          !part.startsWith("!"),
      )
    if (paragraph) description = paragraph.replace(/\s+/g, " ")
  }

  description = truncateAtSentence(description, INTRO_MAX_CHARS)
  if (!description) return null
  return { name, description }
}

// ---- 翻译结果持久缓存（localStorage，30 天 TTL）----

const CACHE_PREFIX = "intro-zh:"
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000

export function loadCachedIntroZh(cacheKey: string): string | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + cacheKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { zh: string; at: number }
    if (!parsed?.zh || Date.now() - parsed.at > CACHE_TTL_MS) return null
    return parsed.zh
  } catch {
    return null
  }
}

export function saveIntroZhCache(cacheKey: string, zh: string): void {
  try {
    localStorage.setItem(
      CACHE_PREFIX + cacheKey,
      JSON.stringify({ zh, at: Date.now() }),
    )
  } catch {
    // 存储满等异常静默忽略
  }
}

/** 判断文本基本已是中文，无需翻译 */
export function looksChinese(text: string): boolean {
  const cjk = (text.match(/[\u4e00-\u9fff]/g) ?? []).length
  return cjk >= text.replace(/\s/g, "").length * 0.3
}
