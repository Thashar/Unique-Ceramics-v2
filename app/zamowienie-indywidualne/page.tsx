import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import VacationBanner from "@/components/layout/VacationBanner";
import CustomOrderForm from "@/components/custom-order/CustomOrderForm";
import { getSettings } from "@/lib/settings";

export default async function CustomOrderPage() {
  const settings = await getSettings([
    "vacation_enabled",
    "vacation_end_date",
    "vacation_message",
  ]);

  const vacationEnabled = settings.vacation_enabled === "true";

  return (
    <>
      <VacationBanner
        message={vacationEnabled ? settings.vacation_message : ""}
        returnDate={vacationEnabled ? settings.vacation_end_date : undefined}
      />
      <Header topOffset={vacationEnabled} />
      <CustomOrderForm topOffset={vacationEnabled} />
      <Footer />
    </>
  );
}
