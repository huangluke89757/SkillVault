import { net } from "electron"

// 技能介绍英译中服务：供详情页「中文简介」使用。
// 设计取舍（YAGNI）：
// - 免费匿名端点链降级：MyMemory（可达性好、单次限 500 字节）→ Google gtx（非官方、额度大）
// - 走 net.fetch（跟随系统代理，且不受渲染层 CSP 限制）
// - 进程内 LRU 缓存，同一段文本不重复请求

const marketFetch = net.fetch.bind(net) as unknown as typeof fetch

const CHUNK_LIMIT = 400
const CACHE_LIMIT = 500
const REQUEST_TIMEOUT_MS = 10_000

const cache = new Map<string, string>()

function chunkText(text: string): string[] {
  if (text.length <= CHUNK_LIMIT) return [text]
  const chunks: string[] = []
  let rest = text.trim()
  while (rest.length > CHUNK_LIMIT) {
    const window = rest.slice(0, CHUNK_LIMIT)
    // 优先在句读处断开，保证分块语义完整
    let cut = Math.max(
      window.lastIndexOf(". "),
      window.lastIndexOf(".\n"),
      window.lastIndexOf("! "),
      window.lastIndexOf("? "),
      window.lastIndexOf("\n"),
    )
    if (cut < CHUNK_LIMIT * 0.4) cut = CHUNK_LIMIT - 1
    chunks.push(rest.slice(0, cut + 1).trim())
    rest = rest.slice(cut + 1).trim()
  }
  if (rest) chunks.push(rest)
  return chunks
}

async function translateChunk(text: string): Promise<string | null> {
  // 端点 1：MyMemory（免费匿名；q 限 500 字节，输入为英文原文，400 字符内安全）
  try {
    const url =
      "https://api.mymemory.translated.net/get?q=" +
      encodeURIComponent(text) +
      "&langpair=en|zh-CN"
    const res = await marketFetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (res.ok) {
      const data = (await res.json()) as {
        responseStatus?: number
        responseData?: { translatedText?: string }
      }
      const out = data.responseData?.translatedText?.trim()
      // 429 = 配额超限，换下一端点
      if (out && data.responseStatus !== 429 && !/^MYMEMORY WARNING/i.test(out)) {
        return out
      }
    }
  } catch {
    // 降级到下一端点
  }

  // 端点 2：Google gtx（非官方免费接口）
  try {
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=" +
      encodeURIComponent(text)
    const res = await marketFetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (res.ok) {
      const data = (await res.json()) as unknown
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const joined = (data[0] as unknown[])
          .map((seg) => (Array.isArray(seg) ? String(seg[0] ?? "") : ""))
          .join("")
        if (joined.trim()) return joined.trim()
      }
    }
  } catch {
    // 全部端点失败，交由调用方降级
  }

  return null
}

/** 英译中；任何一块失败返回 null，由调用方回退展示原文 */
export async function translateToZh(text: string): Promise<string | null> {
  const input = text.trim()
  if (!input) return null

  const cached = cache.get(input)
  if (cached) return cached

  const chunks = chunkText(input)
  const out: string[] = []
  for (const chunk of chunks) {
    const translated = await translateChunk(chunk)
    if (!translated) return null
    out.push(translated)
  }

  const result = out.join("\n").trim()
  if (!result) return null

  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(input, result)
  return result
}
