import { cn } from "@/lib/utils";
import { Star, Trophy, TrendingUp, Award, Sparkles, Medal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type AchievementType = 
  | "ninety-plus" 
  | "subject-topper" 
  | "improvement-star" 
  | "perfect-score"
  | "first-rank"
  | "top-five";

interface AchievementBadgeProps {
  type: AchievementType;
  className?: string;
  animate?: boolean;
}

const achievementConfig: Record<AchievementType, {
  label: string;
  description: string;
  icon: React.ReactNode;
  colors: string;
}> = {
  "ninety-plus": {
    label: "90%+ Achiever",
    description: "Scored 90% or above - Outstanding performance!",
    icon: <Trophy className="h-3.5 w-3.5" />,
    colors: "bg-gradient-to-r from-accent to-accent/80 text-accent-foreground",
  },
  "subject-topper": {
    label: "Subject Topper",
    description: "Highest score in a subject - Exceptional!",
    icon: <Star className="h-3.5 w-3.5" />,
    colors: "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground",
  },
  "improvement-star": {
    label: "Improvement Star",
    description: "Showed significant improvement from last exam",
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    colors: "bg-gradient-to-r from-success to-success/80 text-success-foreground",
  },
  "perfect-score": {
    label: "Perfect Score",
    description: "Achieved 100% in a subject - Brilliant!",
    icon: <Sparkles className="h-3.5 w-3.5" />,
    colors: "bg-gradient-to-r from-accent via-warning to-accent text-accent-foreground",
  },
  "first-rank": {
    label: "Class Topper",
    description: "Ranked 1st in the class - Congratulations!",
    icon: <Medal className="h-3.5 w-3.5" />,
    colors: "bg-gradient-to-r from-accent to-warning text-accent-foreground",
  },
  "top-five": {
    label: "Top 5",
    description: "Among the top 5 students in class",
    icon: <Award className="h-3.5 w-3.5" />,
    colors: "bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground",
  },
};

export function AchievementBadge({ type, className, animate = true }: AchievementBadgeProps) {
  const config = achievementConfig[type];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          className={cn(
            "gap-1.5 px-3 py-1 border-none cursor-default shadow-sm",
            config.colors,
            animate && "hover:scale-105 transition-transform",
            className
          )}
        >
          {config.icon}
          <span className="text-xs font-medium">{config.label}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{config.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface AchievementsListProps {
  percentage: number;
  rank?: number;
  className?: string;
}

export function AchievementsList({ percentage, rank, className }: AchievementsListProps) {
  const achievements: AchievementType[] = [];

  if (percentage >= 90) achievements.push("ninety-plus");
  if (percentage === 100) achievements.push("perfect-score");
  if (rank === 1) achievements.push("first-rank");
  else if (rank && rank <= 5) achievements.push("top-five");

  if (achievements.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {achievements.map((type) => (
        <AchievementBadge key={type} type={type} />
      ))}
    </div>
  );
}
