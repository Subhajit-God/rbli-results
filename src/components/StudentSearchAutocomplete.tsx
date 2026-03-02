import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, User, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface StudentSuggestion {
  id: string;
  student_id: string;
  name: string;
  class_number: number;
  section: string;
  roll_number: number;
}

interface StudentSearchAutocompleteProps {
  onSelect: (student: StudentSuggestion) => void;
}

const StudentSearchAutocomplete = ({ onSelect }: StudentSearchAutocompleteProps) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from("students")
          .select("id, student_id, name, class_number, section, roll_number")
          .or(`name.ilike.%${query}%,student_id.ilike.%${query}%`)
          .limit(6);

        setSuggestions(data || []);
        setIsOpen((data?.length || 0) > 0);
        setSelectedIndex(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelect = (student: StudentSuggestion) => {
    setQuery(student.name);
    setIsOpen(false);
    onSelect(student);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or Student ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          className="pl-9 h-12 min-h-[44px] text-base"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full mt-1 w-full glass-effect rounded-lg border border-border shadow-lg overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {suggestions.map((student, idx) => (
            <button
              key={student.id}
              onClick={() => handleSelect(student)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                "hover:bg-muted/50",
                idx === selectedIndex && "bg-muted/70"
              )}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{student.name}</p>
                <p className="text-xs text-muted-foreground">
                  {student.student_id} • Class {student.class_number} • Roll {student.roll_number}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentSearchAutocomplete;
