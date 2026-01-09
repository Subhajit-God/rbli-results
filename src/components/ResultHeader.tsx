import schoolLogo from "@/assets/school-logo.png";
import { GraduationCap, Sparkles } from "lucide-react";

interface ResultHeaderProps {
  examName?: string;
}

const ResultHeader = ({ examName }: ResultHeaderProps) => {
  return (
    <header className="header-gradient text-primary-foreground py-8 px-4 shadow-official relative overflow-hidden print:py-4">
      {/* Futuristic decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl animate-pulse-subtle" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/20 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl animate-pulse-subtle" />
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-secondary/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl animate-float" />
        
        {/* Cyber grid overlay */}
        <div className="absolute inset-0 cyber-grid opacity-30" />
        
        {/* Scan line effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent animate-scan-line" />
        </div>
      </div>
      
      <div className="container mx-auto flex flex-col items-center gap-4 relative z-10">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="relative group">
            {/* Neon glow ring */}
            <div className="absolute -inset-2 bg-gradient-to-r from-primary via-accent to-primary rounded-full blur-lg opacity-60 group-hover:opacity-100 transition-opacity duration-500 animate-glow-pulse" />
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-full opacity-30" />
            <img 
              src={schoolLogo} 
              alt="Ramjibanpur Babulal Institution Logo" 
              className="w-18 h-18 md:w-24 md:h-24 rounded-full border-2 border-primary-foreground/60 bg-background/20 relative z-10 shadow-lg transition-transform duration-300 group-hover:scale-110"
            />
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-accent animate-pulse-subtle" />
              <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground animate-bounce-subtle" />
              <span className="text-xs md:text-sm font-medium text-primary-foreground/80 tracking-[0.2em] uppercase font-mono">Est. 1925</span>
              <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-accent animate-pulse-subtle" />
            </div>
            <h1 className="text-2xl md:text-4xl font-bold tracking-wide drop-shadow-lg neon-text">
              Ramjibanpur Babulal Institution
            </h1>
            <p className="text-sm md:text-base text-primary-foreground/70 mt-1 font-light tracking-[0.15em] uppercase">
              Excellence in Education
            </p>
          </div>
        </div>
        {examName && (
          <div className="relative group">
            <div className="absolute -inset-1 gold-gradient rounded-full blur opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative gold-gradient text-accent-foreground px-8 py-2.5 rounded-full font-semibold text-sm md:text-base shadow-lg border border-accent/30 animate-fade-in">
              {examName}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default ResultHeader;