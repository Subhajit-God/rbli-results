import { useEffect } from "react";
import confetti from "canvas-confetti";

interface ConfettiEffectProps {
  trigger: boolean;
  percentage?: number;
}

const ConfettiEffect = ({ trigger, percentage = 0 }: ConfettiEffectProps) => {
  useEffect(() => {
    if (!trigger) return;

    const duration = percentage >= 90 ? 4000 : percentage >= 70 ? 3000 : 2000;
    const intensity = percentage >= 90 ? 0.8 : percentage >= 70 ? 0.5 : 0.3;

    // Initial burst
    confetti({
      particleCount: Math.floor(100 * intensity),
      spread: 70,
      origin: { y: 0.6 },
      colors: [
        "hsl(200, 100%, 50%)",
        "hsl(150, 80%, 45%)",
        "hsl(45, 100%, 55%)",
        "hsl(30, 100%, 55%)",
      ],
    });

    // Side bursts for high scorers
    if (percentage >= 70) {
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.65 },
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.65 },
        });
      }, 500);
    }

    // Continuous rain for outstanding
    if (percentage >= 90) {
      const end = Date.now() + duration;
      const interval = setInterval(() => {
        if (Date.now() > end) {
          clearInterval(interval);
          return;
        }
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.5 },
          colors: ["hsl(45, 100%, 55%)", "hsl(200, 100%, 50%)"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.5 },
          colors: ["hsl(150, 80%, 45%)", "hsl(30, 100%, 55%)"],
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [trigger, percentage]);

  return null;
};

export default ConfettiEffect;
