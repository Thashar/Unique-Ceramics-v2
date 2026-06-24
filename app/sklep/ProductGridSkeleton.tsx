export default function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[4/5] bg-sand/50 mb-4" />
          <div className="h-3 bg-sand/50 rounded w-1/3 mb-2" />
          <div className="h-4 bg-sand/50 rounded w-3/4 mb-1" />
          <div className="h-3 bg-sand/50 rounded w-1/4" />
        </div>
      ))}
    </div>
  );
}
