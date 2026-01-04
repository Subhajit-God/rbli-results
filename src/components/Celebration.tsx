import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Trophy, Star, Sparkles, Award } from "lucide-react";

interface CelebrationProps {
  show: boolean;
  isPassed: boolean;
  percentage: number;
  grade: string;
  onComplete?: () => void;
}

export function Celebration({ show, isPassed, percentage, grade, onComplete }: CelebrationProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      setAnimating(true);
      const timer = setTimeout(() => {
        setAnimating(false);
        setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, 500);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!visible) return null;

  const isExcellent = percentage >= 90;
  const isGood = percentage >= 70 && percentage < 90;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-500",
        animating ? "opacity-100" : "opacity-0"
      )}
    >
      <div 
        className={cn(
          "relative p-8 md:p-12 rounded-2xl shadow-2xl text-center transition-all duration-500",
          animating ? "scale-100 opacity-100" : "scale-90 opacity-0",
          isPassed 
            ? isExcellent 
              ? "bg-gradient-to-br from-success/20 to-success/5 border-2 border-success"
              : "bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary"
            : "bg-gradient-to-br from-destructive/20 to-destructive/5 border-2 border-destructive"
        )}
      >
        {/* Floating icons for excellent results */}
        {isExcellent && isPassed && (
          <>
            <Star className="absolute -top-4 -left-4 h-8 w-8 text-accent animate-bounce" />
            <Star className="absolute -top-4 -right-4 h-8 w-8 text-accent animate-bounce delay-100" />
            <Sparkles className="absolute -bottom-4 left-1/2 -translate-x-1/2 h-8 w-8 text-accent animate-pulse" />
          </>
        )}

        {/* Main icon */}
        <div className={cn(
          "mx-auto mb-4 p-4 rounded-full animate-bounce",
          isPassed 
            ? isExcellent 
              ? "bg-success/20 text-success" 
              : "bg-primary/20 text-primary"
            : "bg-destructive/20 text-destructive"
        )}>
          {isPassed ? (
            isExcellent ? <Trophy className="h-12 w-12" /> : <Award className="h-12 w-12" />
          ) : (
            <Star className="h-12 w-12" />
          )}
        </div>

        {/* Message */}
        <h2 className={cn(
          "text-2xl md:text-3xl font-bold mb-2",
          isPassed ? "text-success" : "text-destructive"
        )}>
          {isPassed 
            ? isExcellent 
              ? "Outstanding! 🎉" 
              : isGood 
                ? "Well Done! 👏" 
                : "Congratulations! ✅"
            : "Keep Trying! 💪"
          }
        </h2>

        <p className="text-lg text-muted-foreground mb-4">
          {isPassed 
            ? `You scored ${percentage.toFixed(1)}% with Grade ${grade}`
            : "Don't give up, success is just around the corner!"
          }
        </p>

        {/* Achievement badges */}
        {isPassed && (
          <div className="flex flex-wrap gap-2 justify-center">
            {percentage >= 90 && (
              <span className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm font-medium animate-pulse">
                🏆 90%+ Achiever
              </span>
            )}
            {percentage >= 80 && percentage < 90 && (
              <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                ⭐ Excellent Performance
              </span>
            )}
            {grade === "A+" && (
              <span className="px-3 py-1 rounded-full bg-success text-success-foreground text-sm font-medium">
                🌟 Top Grade
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
