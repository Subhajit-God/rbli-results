import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

interface WhatsAppShareProps {
  studentName: string;
  examName: string;
  percentage: number;
  grade: string;
  isPassed: boolean;
  rank: number;
  className?: string;
}

const WhatsAppShare = ({
  studentName,
  examName,
  percentage,
  grade,
  isPassed,
  rank,
  className,
}: WhatsAppShareProps) => {
  const handleShare = () => {
    const emoji = isPassed
      ? percentage >= 90
        ? "🏆"
        : percentage >= 70
        ? "🌟"
        : "✅"
      : "📋";

    const message = `${emoji} *${examName} Result*

👤 Student: *${studentName}*
📊 Percentage: *${percentage.toFixed(1)}%*
📝 Grade: *${grade}*
🏅 Class Rank: *#${rank}*
${isPassed ? "✅ Status: *PASSED*" : "❌ Status: *FAILED*"}

🏫 Ramjibanpur Babulal Institution
📎 Check results at: ${window.location.origin}`;

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <Button
      onClick={handleShare}
      variant="outline"
      className={className}
      size="lg"
    >
      <Share2 className="mr-2 h-5 w-5" />
      Share on WhatsApp
    </Button>
  );
};

export default WhatsAppShare;
