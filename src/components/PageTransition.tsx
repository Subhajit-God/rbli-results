import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const PageTransition = ({ children, className }: PageTransitionProps) => {
  return (
    <div
      className={cn(
        "animate-in fade-in-0 slide-in-from-bottom-4 duration-500 ease-out fill-mode-both",
        className
      )}
    >
      {children}
    </div>
  );
};

export default PageTransition;
