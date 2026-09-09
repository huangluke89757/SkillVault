import { ThemeToggle } from "@skillsgate/ui"
import { useLocalization } from "../lib/localization"
import { UpdateNotifier } from "./update-notifier"
import skillboxMark from "../assets/skillbox-mark.svg"

export function SkillboxBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`skillbox-brand ${compact ? "skillbox-brand--compact" : ""}`}>
      <img src={skillboxMark} alt="" draggable={false} />
      <span data-no-localize aria-label="SkillVault">
        Skill<span>Vault</span>
      </span>
    </div>
  )
}

export function SidebarUtilities() {
  const { locale, setLocale } = useLocalization()

  return (
    <div className="skillbox-utilities">
      <UpdateNotifier />
      <ThemeToggle />
      <button
        type="button"
        className="skillbox-language"
        onClick={() => setLocale(locale === "zh-CN" ? "en-US" : "zh-CN")}
        aria-label={locale === "zh-CN" ? "切换为英文" : "Switch to Chinese"}
      >
        {locale === "zh-CN" ? "中" : "EN"}
      </button>
      <span className="skillbox-local-state">
        <i /> 本地模式
      </span>
    </div>
  )
}
