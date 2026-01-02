import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Search } from "lucide-react";
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="studentId" className="text-foreground font-medium">
          Student ID <span className="text-destructive">*</span>
        </Label>
        <Input
          id="studentId"
          placeholder="Enter your Student ID"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className={cn(
            "h-12 text-base",
            errors.studentId && "border-destructive focus-visible:ring-destructive"
          )}
        />
        {errors.studentId && (
          <p className="text-sm text-destructive">{errors.studentId}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="class" className="text-foreground font-medium">
          Class <span className="text-destructive">*</span>
        </Label>
        <Select value={classNumber} onValueChange={setClassNumber}>
          <SelectTrigger 
            className={cn(
              "h-12 text-base",
              errors.classNumber && "border-destructive focus-visible:ring-destructive"
            )}
          >
            <SelectValue placeholder="Select your class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">Class 5</SelectItem>
            <SelectItem value="6">Class 6</SelectItem>
            <SelectItem value="7">Class 7</SelectItem>
            <SelectItem value="8">Class 8</SelectItem>
            <SelectItem value="9">Class 9</SelectItem>
          </SelectContent>
        </Select>
        {errors.classNumber && (
          <p className="text-sm text-destructive">{errors.classNumber}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-foreground font-medium">
          Date of Birth <span className="text-destructive">*</span>
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full h-12 justify-start text-left font-normal text-base",
                !dob && "text-muted-foreground",
                errors.dob && "border-destructive focus-visible:ring-destructive"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dob ? format(dob, "dd/MM/yyyy") : "Select your date of birth"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
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
          <p className="text-sm text-destructive">{errors.dob}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-12 text-base font-semibold"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin">⏳</span> Searching...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Search className="h-5 w-5" /> View Result
          </span>
        )}
      </Button>
    </form>
  );
};

export default ResultLookupForm;
