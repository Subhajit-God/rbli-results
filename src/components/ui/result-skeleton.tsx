import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ResultFormSkeleton() {
  return (
    <Card className="shadow-official border-2 border-primary/10 overflow-hidden rounded-xl">
      <div className="h-1.5 gold-gradient" />
      <CardHeader className="text-center space-y-3 pb-2">
        <Skeleton className="mx-auto w-14 h-14 rounded-full skeleton-shimmer" />
        <Skeleton className="h-8 w-48 mx-auto rounded-lg skeleton-shimmer" />
        <Skeleton className="h-5 w-64 mx-auto rounded-lg skeleton-shimmer" />
      </CardHeader>
      <CardContent className="pt-4 pb-8 px-6 md:px-8 space-y-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24 rounded-md skeleton-shimmer" />
            <Skeleton className="h-12 w-full rounded-lg skeleton-shimmer" />
          </div>
        ))}
        <Skeleton className="h-12 w-full mt-6 rounded-lg skeleton-shimmer" />
      </CardContent>
    </Card>
  );
}

export function ResultCardSkeleton() {
  return (
    <Card className="shadow-official border-2 border-primary/10 overflow-hidden rounded-xl animate-pulse" aria-label="Loading result...">
      <CardHeader className="header-gradient p-6 md:p-8">
        <div className="flex items-center gap-4 justify-center">
          <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary-foreground/20 skeleton-shimmer" />
          <div className="text-center space-y-2">
            <Skeleton className="h-6 w-48 bg-primary-foreground/20 rounded-lg skeleton-shimmer" />
            <Skeleton className="h-4 w-24 mx-auto bg-primary-foreground/20 rounded-md skeleton-shimmer" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 md:p-8 space-y-6">
        {/* Student Details Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-5 bg-muted/30 rounded-xl">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20 rounded-md skeleton-shimmer" />
              <Skeleton className="h-5 w-32 rounded-md skeleton-shimmer" />
            </div>
          ))}
        </div>
        
        {/* Table Skeleton - Desktop */}
        <div className="hidden md:block rounded-xl border border-border overflow-hidden">
          <Skeleton className="h-12 w-full rounded-none skeleton-shimmer" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-none skeleton-shimmer" />
          ))}
        </div>

        {/* Card Skeleton - Mobile */}
        <div className="md:hidden space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-xl border border-border space-y-3">
              <Skeleton className="h-5 w-32 rounded-md skeleton-shimmer" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-12 rounded-lg skeleton-shimmer" />
                <Skeleton className="h-12 rounded-lg skeleton-shimmer" />
                <Skeleton className="h-12 rounded-lg skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
        
        {/* Summary Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Loading statistics...">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="shadow-card rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24 rounded-md skeleton-shimmer" />
            <Skeleton className="h-4 w-4 rounded-md skeleton-shimmer" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1 rounded-md skeleton-shimmer" />
            <Skeleton className="h-3 w-20 rounded-md skeleton-shimmer" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TableRowSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-3">
          <Skeleton className="h-5 w-full rounded-md skeleton-shimmer" />
        </td>
      ))}
    </tr>
  );
}

export function DataTableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden" aria-label="Loading data...">
      <div className="bg-muted/50 p-3">
        <div className="flex gap-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1 rounded-md skeleton-shimmer" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-3 border-t border-border">
          <div className="flex gap-3">
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} className="h-5 flex-1 rounded-md skeleton-shimmer" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
