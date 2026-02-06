import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Search, User, BookOpen, Loader2, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ResultLookupFormProps {
  onSubmit: (data: { studentId: string; classNumber: string; dob: Date }) => void;
  isLoading: boolean;
}

const ResultLookupForm = ({ onSubmit, isLoading }: ResultLookupFormProps) => {
  const [studentId, setStudentId] = useState("");
  const [classNumber, setClassNumber] = useState("");
  const [dob, setDob] = useState<Date>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Simulate loading progress
  useState(() => {
    if (isLoading) {
      setLoadingProgress(0);
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 200);
      return () => clearInterval(interval);
    } else {
      setLoadingProgress(100);
    }
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!studentId.trim()) {
      newErrors.studentId = "Student ID is required";
    }
    if (!classNumber) {
      newErrors.classNumber = "Class is required";
    }
    if (!dob) {
      newErrors.dob = "Date of Birth is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm() && dob) {
      setLoadingProgress(0);
      onSubmit({ studentId: studentId.trim(), classNumber, dob });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="studentId" className="text-foreground font-medium flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          Student ID <span className="text-destructive">*</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Enter your unique Student ID (e.g., STU2024001)</p>
            </TooltipContent>
          </Tooltip>
        </Label>
        <Input
          id="studentId"
          placeholder="e.g., STU2024001"
          value={studentId}
          onChange={(e) => {
            setStudentId(e.target.value);
            if (errors.studentId) setErrors(prev => ({ ...prev, studentId: "" }));
          }}
          aria-describedby={errors.studentId ? "studentId-error" : undefined}
          aria-invalid={!!errors.studentId}
          className={cn(
            "h-12 min-h-[44px] text-base transition-all duration-200 focus:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            errors.studentId 
              ? "border-destructive focus-visible:ring-destructive" 
              : "focus:border-primary"
          )}
          disabled={isLoading}
        />
        {errors.studentId && (
          <p id="studentId-error" role="alert" className="text-sm text-destructive flex items-center gap-1 animate-fade-in">
            {errors.studentId}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="class" className="text-foreground font-medium flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          Class <span className="text-destructive">*</span>
        </Label>
        <Select 
          value={classNumber} 
          onValueChange={(value) => {
            setClassNumber(value);
            if (errors.classNumber) setErrors(prev => ({ ...prev, classNumber: "" }));
          }}
          disabled={isLoading}
        >
          <SelectTrigger 
            aria-describedby={errors.classNumber ? "classNumber-error" : undefined}
            aria-invalid={!!errors.classNumber}
            className={cn(
              "h-12 min-h-[44px] text-base transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              errors.classNumber 
                ? "border-destructive focus-visible:ring-destructive"
                : "focus:border-primary"
            )}
          >
            <SelectValue placeholder="Select your class" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {[5, 6, 7, 8, 9].map((cls) => (
              <SelectItem 
                key={cls} 
                value={cls.toString()} 
                className="cursor-pointer transition-colors hover:bg-muted"
              >
                Class {cls}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.classNumber && (
          <p id="classNumber-error" role="alert" className="text-sm text-destructive animate-fade-in">{errors.classNumber}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-foreground font-medium flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          Date of Birth <span className="text-destructive">*</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Select your date of birth as per school records</p>
            </TooltipContent>
          </Tooltip>
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={isLoading}
              aria-describedby={errors.dob ? "dob-error" : undefined}
              aria-invalid={!!errors.dob}
              className={cn(
                "w-full h-12 min-h-[44px] justify-start text-left font-normal text-base transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                !dob && "text-muted-foreground",
                errors.dob 
                  ? "border-destructive focus-visible:ring-destructive"
                  : "hover:border-primary focus:border-primary"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              {dob ? format(dob, "dd/MM/yyyy") : "Select your date of birth"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover" align="start">
            <Calendar
              mode="single"
              selected={dob}
              onSelect={(date) => {
                setDob(date);
                if (errors.dob) setErrors(prev => ({ ...prev, dob: "" }));
              }}
              disabled={(date) =>
                date > new Date() || date < new Date("1990-01-01")
              }
              initialFocus
              className="p-3 pointer-events-auto"
              captionLayout="dropdown-buttons"
              fromYear={1990}
              toYear={new Date().getFullYear()}
            />
          </PopoverContent>
        </Popover>
        {errors.dob && (
          <p id="dob-error" role="alert" className="text-sm text-destructive animate-fade-in">{errors.dob}</p>
        )}
      </div>

      {/* Loading Progress */}
      {isLoading && (
        <div className="space-y-2 animate-fade-in">
          <Progress value={loadingProgress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            Fetching your result...
          </p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-12 min-h-[44px] text-base font-semibold mt-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Searching...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            View Result
          </span>
        )}
      </Button>
    </form>
  );
};

export default ResultLookupForm;
