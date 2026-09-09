import { ThemeToggle } from "@skillvault/ui"
import { useLocalization } from "../lib/localization"
import { UpdateNotifier } from "./update-notifier"
import skillvaultMark from "../assets/skillvault-mark.svg"

export function SkillVaultBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`skillvault-brand ${compact ? "skillvault-brand--compact" : ""}`}>
      <img src={skillvaultMark} alt="" draggable={false} />
      <span data-no-localize aria-label="SkillVault">
        Skill<span>Vault</span>
      </span>
    </div>
  )
}

export function SidebarUtilities() {
  const { locale, setLocale } = useLocalization()

  return (
    <div className="skillvault-utilities">
      <UpdateNotifier />
      <ThemeToggle />
      <button
        type="button"
        className="skillvault-language"
        onClick={() => setLocale(locale === "zh-CN" ? "en-US" : "zh-CN")}
        aria-label={locale === "zh-CN" ? "切换为英文" : "Switch to Chinese"}
      >
        {locale === "zh-CN" ? "中" : "EN"}
      </button>
      <span className="skillvault-local-state">
        <i /> 本地模式
      </span>
    </div>
  )
}
