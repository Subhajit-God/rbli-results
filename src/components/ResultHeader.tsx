import schoolLogo from "@/assets/school-logo.png";

interface ResultHeaderProps {
  examName?: string;
}

const ResultHeader = ({ examName }: ResultHeaderProps) => {
  return (
    <header className="header-gradient text-primary-foreground py-6 px-4 shadow-official">
      <div className="container mx-auto flex flex-col items-center gap-4">
        <div className="flex items-center gap-4 md:gap-6">
          <img 
            src={schoolLogo} 
            alt="School Logo" 
            className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-primary-foreground/50 bg-primary/20"
          />
          <div className="text-center">
            <h1 className="text-xl md:text-3xl font-bold tracking-wide">
              Ramjibanpur Babulal Institution
            </h1>
            <p className="text-sm md:text-base text-primary-foreground/80 mt-1">
              Estd. 1925
            </p>
          </div>
        </div>
        {examName && (
          <div className="gold-gradient text-accent-foreground px-6 py-2 rounded-md font-semibold text-sm md:text-base">
            {examName}
          </div>
        )}
      </div>
    </header>
  );
};

export default ResultHeader;
