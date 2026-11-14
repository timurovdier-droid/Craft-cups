export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Загрузка">
      <div className="h-8 w-48 rounded-lg bg-[var(--line)]" />
      <div className="mt-2 h-4 w-64 rounded bg-[var(--line)]" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-28 rounded-2xl bg-white" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="h-72 rounded-2xl bg-white" />
        <div className="h-72 rounded-2xl bg-white lg:col-span-2" />
      </div>
    </div>
  );
}
