import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ResultFormSkeleton() {
  return (
    <Card className="shadow-official border-2 border-primary/10 overflow-hidden">
      <div className="h-1.5 gold-gradient" />
      <CardHeader className="text-center space-y-3 pb-2">
        <Skeleton className="mx-auto w-14 h-14 rounded-full" />
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-5 w-64 mx-auto" />
      </CardHeader>
      <CardContent className="pt-4 pb-8 px-6 md:px-8 space-y-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
        <Skeleton className="h-12 w-full mt-6" />
      </CardContent>
    </Card>
  );
}

export function ResultCardSkeleton() {
  return (
    <Card className="shadow-official border-2 border-primary/10 overflow-hidden animate-pulse">
      <CardHeader className="header-gradient p-6 md:p-8">
        <div className="flex items-center gap-4 justify-center">
          <Skeleton className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary-foreground/20" />
          <div className="text-center space-y-2">
            <Skeleton className="h-6 w-48 bg-primary-foreground/20" />
            <Skeleton className="h-4 w-24 mx-auto bg-primary-foreground/20" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 md:p-8 space-y-6">
        {/* Student Details Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-5 bg-muted/30 rounded-xl">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </div>
        
        {/* Table Skeleton */}
        <div className="rounded-xl border border-border overflow-hidden">
          <Skeleton className="h-12 w-full" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        
        {/* Summary Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
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
          <Skeleton className="h-5 w-full" />
        </td>
      ))}
    </tr>
  );
}
