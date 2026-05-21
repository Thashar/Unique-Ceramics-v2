export const dynamic = "force-dynamic";

const SETTINGS = [
  { label: "Koszt wysyłki", value: "18 zł" },
  { label: "Darmowa wysyłka od", value: "300 zł" },
  { label: "Telefon", value: "+48 668 443 706" },
  { label: "E-mail", value: "kontakt@uniqueceramics.pl" },
  { label: "Instagram", value: "@unique.ceramics" },
];

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl text-espresso mb-8">Ustawienia</h1>

      <div className="bg-cream p-6 max-w-lg">
        <h2 className="text-xs tracking-widest uppercase text-charcoal/50 mb-6">Dane sklepu</h2>

        <div className="space-y-4">
          {SETTINGS.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-3 border-b border-sand last:border-0">
              <span className="text-xs tracking-widest uppercase text-charcoal/50">{label}</span>
              <span className="text-sm text-espresso font-medium">{value}</span>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-charcoal/40 leading-relaxed">
          Aby zmienić te wartości, zaktualizuj kod w repozytorium.
        </p>
      </div>
    </div>
  );
}
