import { Skeleton } from "@/components/ui/feedback";

export default function ReceiptLoading() {
  return (
    <div className="min-h-screen bg-[#f6f6f3] px-4 py-8">
      <div className="mx-auto max-w-[760px] space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-32 rounded-[12px]" />
        </div>
        <div className="rounded-[22px] border border-line bg-white p-7">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="space-y-2 text-right">
              <Skeleton className="ml-auto h-3 w-20" />
              <Skeleton className="ml-auto h-5 w-32" />
              <Skeleton className="ml-auto h-6 w-20 rounded-full" />
            </div>
          </div>
          <div className="mt-7 grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="space-y-2 sm:ml-auto">
              <Skeleton className="h-3 w-24 sm:ml-auto" />
              <Skeleton className="h-3.5 w-36 sm:ml-auto" />
              <Skeleton className="h-3.5 w-32 sm:ml-auto" />
            </div>
          </div>
          <Skeleton className="mt-7 h-14 w-full rounded-[12px]" />
          <Skeleton className="mt-6 ml-auto h-12 w-56" />
          <Skeleton className="mt-6 h-20 w-full rounded-[14px]" />
        </div>
      </div>
    </div>
  );
}
