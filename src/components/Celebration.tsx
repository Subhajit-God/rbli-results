import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Trophy, Star, Sparkles, Award } from "lucide-react";
import confetti from "canvas-confetti";
import { useCelebrationSound } from "@/hooks/useCelebrationSound";

interface CelebrationProps {
  show: boolean;
  isPassed: boolean;
  percentage: number;
  grade: string;
  onComplete?: () => void;
}

// Particle explosion effect
const fireParticleExplosion = (isPassed: boolean, isExcellent: boolean) => {
  const duration = 3000; // Extended duration for 5s total animation
  const end = Date.now() + duration;

  // Color schemes based on result
  const passedColors = isExcellent 
    ? ["#22c55e", "#eab308", "#3b82f6", "#f97316", "#06b6d4"]
    : ["#3b82f6", "#22c55e", "#eab308", "#06b6d4"];
  const failedColors = ["#f97316", "#eab308", "#ef4444"];
  const colors = isPassed ? passedColors : failedColors;

  // Center explosion burst
  confetti({
    particleCount: 100,
    spread: 100,
    origin: { x: 0.5, y: 0.5 },
    colors,
    startVelocity: 45,
    gravity: 0.8,
    scalar: 1.2,
    ticks: 100,
    zIndex: 9999,
  });

  // Multi-directional bursts
  const directions = [
    { angle: 45, x: 0.2, y: 0.8 },
    { angle: 135, x: 0.8, y: 0.8 },
    { angle: 90, x: 0.5, y: 0.9 },
    { angle: 60, x: 0.3, y: 0.7 },
    { angle: 120, x: 0.7, y: 0.7 },
  ];

  directions.forEach((dir, i) => {
    setTimeout(() => {
      confetti({
        particleCount: 30,
        angle: dir.angle,
        spread: 60,
        origin: { x: dir.x, y: dir.y },
        colors,
        startVelocity: 35,
        gravity: 1,
        scalar: 0.9,
        ticks: 80,
        zIndex: 9999,
      });
    }, i * 100);
  });

  // Continuous sparkle effect for excellent results
  if (isExcellent && isPassed) {
    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
        shapes: ["star"],
        scalar: 1.5,
        zIndex: 9999,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
        shapes: ["star"],
        scalar: 1.5,
        zIndex: 9999,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }
};

export function Celebration({ show, isPassed, percentage, grade, onComplete }: CelebrationProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [hasExploded, setHasExploded] = useState(false);
  const { playCelebrationSound } = useCelebrationSound();

  const isExcellent = percentage >= 90;
  const isGood = percentage >= 70 && percentage < 90;

  useEffect(() => {
    if (show && !hasExploded) {
      setVisible(true);
      setAnimating(true);
      setHasExploded(true);
      
      // Fire the particle explosion and play sound
      setTimeout(() => {
        fireParticleExplosion(isPassed, isExcellent);
        playCelebrationSound(isPassed, isExcellent);
      }, 200);

      // Extended to 5 seconds total
      const timer = setTimeout(() => {
        setAnimating(false);
        setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, 500);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete, isPassed, isExcellent, hasExploded, playCelebrationSound]);

  // Reset hasExploded when show becomes false
  useEffect(() => {
    if (!show) {
      setHasExploded(false);
    }
  }, [show]);

  if (!visible) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-500",
        animating ? "opacity-100" : "opacity-0"
      )}
    >
      <div 
        className={cn(
          "relative p-8 md:p-12 rounded-2xl shadow-2xl text-center transition-all duration-500 glass-effect",
          animating ? "scale-100 opacity-100" : "scale-90 opacity-0",
          isPassed 
            ? isExcellent 
              ? "neon-border bg-gradient-to-br from-success/30 to-success/10 border-2 border-success"
              : "neon-border bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary"
            : "bg-gradient-to-br from-destructive/30 to-destructive/10 border-2 border-destructive"
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
