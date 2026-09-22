// 安装口令生成：把「人点按钮安装」变成「一句话交给 Agent 自助安装」
// 纯函数、零依赖（YAGNI），供列表卡片与详情面板共用。

export interface PromptSkill {
  name: string
  skillId: string
  source: string
}

// 自举文档：Agent 读到它就知道怎么装。托管在仓库，后续可换独立域名。
const INSTALL_DOC_URL =
  "https://github.com/huangluke89757/SkillVault/blob/main/INSTALL.md"

// 自然语言口令：复制给任意 Agent 即可自助完成安装
export function genInstallPrompt(skill: PromptSkill, agents: string[]): string {
  if (agents.length === 0) {
    return `请安装「${skill.name}」技能（${skill.source}）：请先阅读 ${INSTALL_DOC_URL} 的安装说明，然后询问我要安装到哪个 Agent，再执行安装。`
  }
  return `请安装「${skill.name}」技能（${skill.source}）：根据 ${INSTALL_DOC_URL} 的说明，把该技能安装到 ${agents.join("、")}。`
}

// CLI 命令：沿用生态既有 skills CLI（自有 CLI 后置，不虚构命令）
export function genCliCommand(skill: PromptSkill): string {
  return `npx skills add ${skill.source}`
}

// Zip 兜底：脱离应用也能手动装（默认分支按 main 推断）
export function genZipUrl(skill: PromptSkill): string {
  return `https://github.com/${skill.source}/archive/refs/heads/main.zip`
}
