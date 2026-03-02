import { useState, useEffect } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

const TypewriterText = ({ text, speed = 80, className, onComplete }: TypewriterTextProps) => {
  const [displayed, setDisplayed] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timer = setTimeout(() => {
        setDisplayed((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else {
      onComplete?.();
    }
  }, [index, text, speed, onComplete]);

  return (
    <span className={className}>
      {displayed}
      {index < text.length && (
        <span className="inline-block w-0.5 h-[1em] bg-primary animate-pulse ml-0.5 align-text-bottom" />
      )}
    </span>
  );
};

export default TypewriterText;
