import fs from "node:fs/promises"

export async function resolveWatchDirectories(
  canonicalDir: string,
  agentDirectories: string[],
): Promise<string[]> {
  await fs.mkdir(canonicalDir, { recursive: true })

  const directories = new Set<string>([await fs.realpath(canonicalDir)])
  for (const directory of agentDirectories) {
    try {
      directories.add(await fs.realpath(directory))
    } catch {
      // Agent 目录不存在时不由文件监听器创建。
    }
  }

  return [...directories]
}
