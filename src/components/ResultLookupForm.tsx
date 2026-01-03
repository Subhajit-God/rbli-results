import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Search, User, BookOpen, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
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

interface ResultLookupFormProps {
  onSubmit: (data: { studentId: string; classNumber: string; dob: Date }) => void;
  isLoading: boolean;
}

const ResultLookupForm = ({ onSubmit, isLoading }: ResultLookupFormProps) => {
  const [studentId, setStudentId] = useState("");
  const [classNumber, setClassNumber] = useState("");
  const [dob, setDob] = useState<Date>();
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      onSubmit({ studentId: studentId.trim(), classNumber, dob });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="studentId" className="text-foreground font-medium flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          Student ID <span className="text-destructive">*</span>
        </Label>
        <Input
          id="studentId"
          placeholder="e.g., STU2024001"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className={cn(
            "h-12 text-base transition-all duration-200 focus:shadow-md",
            errors.studentId 
              ? "border-destructive focus-visible:ring-destructive" 
              : "focus:border-primary"
          )}
        />
        {errors.studentId && (
          <p className="text-sm text-destructive flex items-center gap-1 animate-fade-in">
            {errors.studentId}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="class" className="text-foreground font-medium flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          Class <span className="text-destructive">*</span>
        </Label>
        <Select value={classNumber} onValueChange={setClassNumber}>
          <SelectTrigger 
            className={cn(
              "h-12 text-base transition-all duration-200",
              errors.classNumber 
                ? "border-destructive focus-visible:ring-destructive"
                : "focus:border-primary"
            )}
          >
            <SelectValue placeholder="Select your class" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {[5, 6, 7, 8, 9].map((cls) => (
              <SelectItem key={cls} value={cls.toString()} className="cursor-pointer">
                Class {cls}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.classNumber && (
          <p className="text-sm text-destructive animate-fade-in">{errors.classNumber}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-foreground font-medium flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          Date of Birth <span className="text-destructive">*</span>
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full h-12 justify-start text-left font-normal text-base transition-all duration-200",
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
              onSelect={setDob}
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
          <p className="text-sm text-destructive animate-fade-in">{errors.dob}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-12 text-base font-semibold mt-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
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
