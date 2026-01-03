import schoolLogo from "@/assets/school-logo.png";
import { GraduationCap } from "lucide-react";

interface ResultHeaderProps {
  examName?: string;
}

const ResultHeader = ({ examName }: ResultHeaderProps) => {
  return (
    <header className="header-gradient text-primary-foreground py-8 px-4 shadow-official relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-64 h-64 bg-accent rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent rounded-full translate-x-1/2 translate-y-1/2" />
      </div>
      
      <div className="container mx-auto flex flex-col items-center gap-4 relative z-10">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-accent/30 rounded-full blur-lg animate-pulse" />
            <img 
              src={schoolLogo} 
              alt="School Logo" 
              className="w-18 h-18 md:w-24 md:h-24 rounded-full border-3 border-primary-foreground/60 bg-primary/20 relative z-10 shadow-lg"
            />
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-accent" />
              <span className="text-xs md:text-sm font-medium text-accent tracking-wider uppercase">Est. 1925</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold tracking-wide drop-shadow-md">
              Ramjibanpur Babulal Institution
            </h1>
            <p className="text-sm md:text-base text-primary-foreground/70 mt-1 font-light tracking-wide">
              Excellence in Education
            </p>
          </div>
        </div>
        {examName && (
          <div className="gold-gradient text-accent-foreground px-8 py-2.5 rounded-full font-semibold text-sm md:text-base shadow-lg border border-accent/30">
            {examName}
          </div>
        )}
      </div>
    </header>
  );
};

export default ResultHeader;
