import { Calendar, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CurrentYearBannerProps {
  academicYear: string | null;
  examName?: string;
}

const CurrentYearBanner = ({ academicYear, examName }: CurrentYearBannerProps) => {
  if (!academicYear) {
    return (
      <div className="bg-muted/50 border border-border rounded-lg px-4 py-2 flex items-center gap-3">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          No academic year set as current. Please set one in the Academic Year tab.
        </span>
      </div>
    );
  }

  return (
    <div className="bg-primary/10 border border-primary/30 rounded-lg px-4 py-2 flex items-center gap-3">
      <Star className="h-4 w-4 text-primary fill-primary" />
      <span className="text-sm font-medium text-foreground">
        Current Academic Year: <span className="text-primary font-bold">{academicYear}</span>
      </span>
      {examName && (
        <Badge variant="secondary" className="text-xs">
          {examName}
        </Badge>
      )}
    </div>
  );
};

export default CurrentYearBanner;
