import { net } from "electron"

// 技能介绍英译中服务：供详情页「中文简介」使用。
// 设计取舍（YAGNI）：
// - 免费匿名端点链降级：MyMemory（可达性好、单次限 500 字节）→ Google gtx（非官方、额度大）
// - 走 net.fetch（跟随系统代理，且不受渲染层 CSP 限制）
// - 进程内 LRU 缓存，同一段文本不重复请求

const marketFetch = net.fetch.bind(net) as unknown as typeof fetch

const CHUNK_LIMIT = 400
const CACHE_LIMIT = 500
// 实测：MyMemory 冷启动 ~3.3s / 热请求 ~1.1s；超时给 8s 足够，
// 不再保留不可达的兜底端点（实测 Google gtx 在本机不通，留着只会让用户白等 10s）。
const REQUEST_TIMEOUT_MS = 8_000
const CONCURRENCY = 3

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
  // MyMemory：免费匿名端点，q 限 500 字节（输入为英文原文，400 字符内安全）
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
      // 429 = 配额超限；带 WARNING 前缀说明未真正翻译
      if (out && data.responseStatus !== 429 && !/^MYMEMORY WARNING/i.test(out)) {
        return out
      }
    }
  } catch {
    // 失败由调用方降级
  }

  return null
}

/** 有限并发执行，避免多块串行拖慢整体耗时 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await worker(items[index])
    }
  })
  await Promise.all(runners)
  return results
}

/** 英译中；任何一块失败返回 null，由调用方回退展示原文 */
export async function translateToZh(text: string): Promise<string | null> {
  const input = text.trim()
  if (!input) return null

  const cached = cache.get(input)
  if (cached) return cached

  const chunks = chunkText(input)
  // 并发请求：简介通常 1 块，长文本最多 3 块同时进行，避免串行叠加耗时
  const translatedChunks = await mapWithConcurrency(chunks, CONCURRENCY, translateChunk)
  if (translatedChunks.some((part) => !part)) return null

  const result = translatedChunks.join("\n").trim()
  if (!result) return null

  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(input, result)
  return result
}
