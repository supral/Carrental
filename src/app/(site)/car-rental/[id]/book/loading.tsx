export default function RentalBookLoading() {
  return (
    <div className="bg-gray-50 py-10 lg:py-14">
      <div className="mx-auto max-w-7xl animate-pulse px-4 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-3">
          <div className="h-4 w-40 rounded bg-gray-200" />
          <div className="h-9 w-80 max-w-full rounded bg-gray-200" />
          <div className="h-4 w-64 rounded bg-gray-200" />
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="h-5 w-28 rounded bg-gray-200" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="h-16 rounded-xl bg-gray-100" />
                <div className="h-16 rounded-xl bg-gray-100" />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="h-5 w-36 rounded bg-gray-200" />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <div className="h-3 w-24 rounded bg-gray-200" />
                    <div className="h-11 rounded-xl bg-gray-100" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="h-80 rounded-[24px] border border-gray-200 bg-white" />
        </div>
      </div>
    </div>
  );
}
