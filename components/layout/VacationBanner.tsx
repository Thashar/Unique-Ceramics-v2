export default function VacationBanner({
  message,
  returnDate,
}: {
  message: string;
  returnDate?: string;
}) {
  if (!message && !returnDate) return null;

  let formattedDate = "";
  if (returnDate) {
    try {
      formattedDate = new Date(returnDate + "T00:00:00").toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      formattedDate = returnDate;
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-10 bg-terracotta text-espresso text-xs font-semibold flex items-center justify-center px-6 text-center tracking-wide gap-2">
      {message && <span>{message}</span>}
      {formattedDate && <span>{formattedDate}</span>}
    </div>
  );
}
