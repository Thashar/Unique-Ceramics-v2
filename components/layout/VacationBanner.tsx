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

  const text = [message, formattedDate].filter(Boolean).join(" — ");

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-10 bg-terracotta text-espresso font-semibold flex items-center justify-center px-4 text-center tracking-wide overflow-hidden">
      <span
        className="block whitespace-nowrap"
        style={{ fontSize: "clamp(10px, 2.2vw, 13px)" }}
      >
        {text}
      </span>
    </div>
  );
}
