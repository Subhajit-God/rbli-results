import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface Props {
  target: string | Date;
  onComplete?: () => void;
  compact?: boolean;
}

const pad = (n: number) => n.toString().padStart(2, "0");

const CountdownTimer = ({ target, onComplete, compact }: Props) => {
  const targetMs = typeof target === "string" ? new Date(target).getTime() : target.getTime();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, targetMs - now);
  useEffect(() => { if (diff === 0) onComplete?.(); }, [diff, onComplete]);

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1000);

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-sm">
        <Clock className="h-3.5 w-3.5" />
        {days > 0 && `${days}d `}
        {pad(hours)}:{pad(mins)}:{pad(secs)}
      </span>
    );
  }

  const Box = ({ v, l }: { v: number; l: string }) => (
    <div className="flex flex-col items-center px-3 py-2 rounded-lg glass-effect neon-border min-w-[64px]">
      <span className="text-2xl md:text-3xl font-bold text-primary text-glow font-mono tabular-nums">{pad(v)}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</span>
    </div>
  );

  return (
    <div className="flex items-center justify-center gap-2 md:gap-3">
      <Box v={days} l="Days" />
      <Box v={hours} l="Hrs" />
      <Box v={mins} l="Min" />
      <Box v={secs} l="Sec" />
    </div>
  );
};

export default CountdownTimer;
