export default function VacationBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-10 bg-espresso text-cream/90 text-xs flex items-center justify-center px-6 text-center tracking-wide">
      {message}
    </div>
  );
}
