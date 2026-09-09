// intent-matcher.ts
// ---------------------------------------------------------------------------
// 本地语义「意图匹配」引擎（SkillVault 颠覆版技能市场核心）
//
// 设计要点：
//  - 在渲染进程内运行，无需后端；使用开源轻量模型 @xenova/transformers
//    (Xenova/all-MiniLM-L6-v2) 将「用户自然语言需求」与「技能文本」映射到
//    同一向量空间，用余弦相似度返回 top-K 相关技能。
//  - 模型首次使用时惰性下载并缓存到浏览器缓存（useBrowserCache），后续秒级。
//  - 若模型不可用（无网络 / 下载失败），自动降级为关键词匹配，保证功能
//    始终可用，不阻塞主流程。
// ---------------------------------------------------------------------------

export interface IntentSkill {
  id: string
  skillId: string
  name: string
  installs: number
  source: string
  isOfficial?: boolean
}

export interface IntentResult {
  skill: IntentSkill
  score: number
}

interface FeatureExtractionTensor {
  data: Float32Array
}

type FeatureExtractionPipeline = (
  text: string,
  opts?: { pooling?: string; normalize?: boolean },
) => Promise<FeatureExtractionTensor>

interface TransformersModule {
  pipeline: (
    task: string,
    model: string,
    options?: Record<string, unknown>,
  ) => Promise<FeatureExtractionPipeline>
  env: {
    allowLocalModels: boolean
    useBrowserCache: boolean
    backends?: {
      onnx?: {
        wasm?: { proxy?: boolean; numThreads?: number }
      }
    }
  }
}

const MODEL_ID = "Xenova/all-MiniLM-L6-v2"
const CACHE_KEY = "skillvault:intent-embeddings:v1"

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null
let embeddingsCache: Record<string, number[]> | null = null

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (extractorPromise) return extractorPromise
  extractorPromise = (async () => {
    const mod = (await import("@xenova/transformers")) as unknown as TransformersModule
    mod.env.allowLocalModels = false
    mod.env.useBrowserCache = true
    if (mod.env.backends?.onnx?.wasm) {
      mod.env.backends.onnx.wasm.proxy = false
      mod.env.backends.onnx.wasm.numThreads = 1
    }
    return mod.pipeline("feature-extraction", MODEL_ID)
  })()
  return extractorPromise
}

export async function prewarmIntentModel(): Promise<void> {
  try {
    await getExtractor()
  } catch {
    // 网络/下载失败时静默降级，不阻塞 UI
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

// 技能名通常已含语义（如 tdd / frontend-design / grill-me），叠加 id 与来源
// 作为可嵌入文本；后续如能取到 SKILL.md 描述可在此拼接增强。
function corpusText(skill: IntentSkill): string {
  return `${skill.name} ${skill.skillId} ${skill.source}`.trim()
}

async function loadCache(): Promise<Record<string, number[]>> {
  if (embeddingsCache) return embeddingsCache
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    embeddingsCache = raw ? (JSON.parse(raw) as Record<string, number[]>) : {}
  } catch {
    embeddingsCache = {}
  }
  return embeddingsCache
}

async function saveCache(): Promise<void> {
  try {
    if (embeddingsCache) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(embeddingsCache))
    }
  } catch {
    // 缓存配额溢出时忽略，不影响匹配
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9一-龥]+/i)
    .filter(Boolean)
}

// 无模型时的降级：基于词元重叠 + 安装量轻微加权
function keywordMatch(
  query: string,
  corpus: IntentSkill[],
  topK: number,
): IntentResult[] {
  const qTokens = new Set(tokenize(query))
  if (qTokens.size === 0) return []
  const scored = corpus.map((skill) => {
    const text = corpusText(skill).toLowerCase()
    let hit = 0
    qTokens.forEach((t) => {
      if (text.includes(t)) hit += 1
    })
    const score = hit / qTokens.size
    return {
      skill,
      score: score * 0.9 + Math.min(skill.installs / 1_000_000, 0.1),
    }
  })
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

/**
 * 对语料执行意图匹配，返回 top-K 结果。
 * 返回 usedModel=true 表示走语义模型，false 表示已降级到关键词。
 */
export async function matchIntent(
  query: string,
  corpus: IntentSkill[],
  topK = 8,
): Promise<{ results: IntentResult[]; usedModel: boolean }> {
  const q = query.trim()
  if (!q || corpus.length === 0) return { results: [], usedModel: false }

  let extractor: FeatureExtractionPipeline | null = null
  try {
    extractor = await getExtractor()
  } catch (err) {
    console.warn("[intent] model unavailable, falling back to keyword match", err)
  }

  if (!extractor) {
    return { results: keywordMatch(q, corpus, topK), usedModel: false }
  }

  const cache = await loadCache()
  const vectors: Array<{ skill: IntentSkill; vec: number[] }> = []
  for (const skill of corpus) {
    let vec = cache[skill.id]
    if (!vec) {
      const out = await extractor(corpusText(skill), {
        pooling: "mean",
        normalize: true,
      })
      vec = Array.from(out.data)
      cache[skill.id] = vec
    }
    vectors.push({ skill, vec })
  }
  await saveCache()

  const qOut = await extractor(q, { pooling: "mean", normalize: true })
  const qVec = Array.from(qOut.data)

  const results = vectors
    .map(({ skill, vec }) => ({ skill, score: cosineSimilarity(qVec, vec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  return { results, usedModel: true }
}
