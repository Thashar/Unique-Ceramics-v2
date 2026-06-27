import Header from "./Header";
import VacationBanner from "./VacationBanner";
import { getProjects } from "@/lib/portfolio";
import { getSettings } from "@/lib/settings";

export default async function HeaderWrapper({ hideVacation }: { hideVacation?: boolean } = {}) {
  const [projects, settings] = await Promise.all([
    getProjects(),
    getSettings(["vacation_enabled", "vacation_end_date", "vacation_message"]),
  ]);

  const vacationEnabled = settings.vacation_enabled === "true";
  const vacationMessage = vacationEnabled ? settings.vacation_message : "";

  const withBanner = !hideVacation && vacationEnabled;

  return (
    <>
      {withBanner && (
        <VacationBanner
          message={vacationMessage}
          returnDate={settings.vacation_end_date}
        />
      )}
      <Header topOffset={withBanner} showProjects={projects.length > 0} />
      {/* Spacer w normalnym przepływie — zastępuje pt-[...] na stronach */}
      <div className={withBanner ? "h-[100px]" : "h-20"} aria-hidden="true" />
    </>
  );
}
