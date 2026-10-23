import { Skeleton } from "@/components/ui/feedback";

export default function MemberLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3.5">
        <Skeleton className="size-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-36" />
        </div>
      </div>
      <div className="rounded-[20px] border border-line bg-white p-5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-6 w-44" />
        <Skeleton className="mt-2 h-3.5 w-56" />
        <Skeleton className="mt-5 h-9 w-full rounded-[12px]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="rounded-[18px] border border-line bg-white p-4">
            <Skeleton className="size-8 rounded-[10px]" />
            <Skeleton className="mt-3 h-6 w-16" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="rounded-[18px] border border-line bg-white p-5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-5 h-20 w-full rounded-[12px]" />
      </div>
      <div className="rounded-[18px] border border-line bg-white p-5">
        <Skeleton className="h-4 w-32" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-[14px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
