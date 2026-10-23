import { Skeleton } from "@/components/ui/feedback";

export default function OwnerLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-[18px] border border-line bg-white p-5">
            <Skeleton className="size-8 rounded-[10px]" />
            <Skeleton className="mt-4 h-7 w-24" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[18px] border border-line bg-white p-5 lg:col-span-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-5 h-[220px] w-full rounded-[14px]" />
        </div>
        <div className="rounded-[18px] border border-line bg-white p-5">
          <Skeleton className="h-4 w-28" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-[18px] border border-line bg-white p-5">
        <Skeleton className="h-4 w-40" />
        <div className="mt-4 space-y-2.5">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-11 w-full rounded-[12px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
