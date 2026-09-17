import Header from "./Header";
import VacationBanner from "./VacationBanner";
import { getProjects } from "@/lib/portfolio";
import { getSettings } from "@/lib/settings";
import { enSettingKey } from "@/lib/i18n-content";
import type { Locale } from "@/lib/i18n";

export default async function HeaderWrapper({
  hideVacation,
  locale = "pl",
}: { hideVacation?: boolean; locale?: Locale } = {}) {
  const [projects, settings] = await Promise.all([
    getProjects(),
    // Komunikat urlopowy po angielsku (`en_vacation_message`) – bez niego
    // wersja angielska pokazuje polski tekst
    getSettings(["vacation_enabled", "vacation_end_date", "vacation_message", enSettingKey("vacation_message")]),
  ]);

  const vacationEnabled = settings.vacation_enabled === "true";
  const vacationMessage = vacationEnabled
    ? (locale === "en" && settings[enSettingKey("vacation_message")]?.trim()) || settings.vacation_message
    : "";

  const withBanner = !hideVacation && vacationEnabled;

  return (
    <>
      {withBanner && (
        <VacationBanner
          message={vacationMessage}
          returnDate={settings.vacation_end_date}
          locale={locale}
        />
      )}
      <Header topOffset={withBanner} showProjects={projects.length > 0} />
      {/* Spacer w normalnym przepływie – zastępuje pt-[...] na stronach.
          Nie renderowany gdy hideVacation (strona główna ma hero od samej góry). */}
      {!hideVacation && <div className={withBanner ? "h-[100px]" : "h-20"} aria-hidden="true" />}
    </>
  );
}
