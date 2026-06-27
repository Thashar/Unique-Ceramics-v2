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

  return (
    <>
      {!hideVacation && (
        <VacationBanner
          message={vacationMessage}
          returnDate={vacationEnabled ? settings.vacation_end_date : undefined}
        />
      )}
      <Header topOffset={!hideVacation} showProjects={projects.length > 0} />
    </>
  );
}
