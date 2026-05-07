import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Save, AlertTriangle, Check, X, Info, Layers } from "lucide-react";
import { recalculateClassRanks, recalculateAllClasses } from "@/lib/rankCalculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import RanksManualExcelImport from "./RanksManualExcelImport";

interface Exam {
  id: string;
  name: string;
  academic_year: string;
  is_deployed: boolean;
}

interface RankData {
  id: string;
  student_id: string;
  exam_id: string;
  total_marks: number;
  percentage: number;
  grade: string;
  rank: number | null;
  is_passed: boolean;
  has_conflict: boolean;
  student: {
    name: string;
    student_id: string;
    class_number: number;
    roll_number: number;
  };
}

const getGrade = (percentage: number): string => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 45) return 'C+';
  if (percentage >= 25) return 'C';
  return 'D';
};

const RanksSection = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [ranks, setRanks] = useState<RankData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("5");
  const [editedRanks, setEditedRanks] = useState<Record<string, number>>({});
  const [hasConflicts, setHasConflicts] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam && selectedClass) {
      fetchRanks();
    }
  }, [selectedExam, selectedClass]);

  const fetchExams = async () => {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setExams(data);
    setIsLoading(false);
  };

  const fetchRanks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ranks')
        .select(`
          *,
          student:students (
            name,
            student_id,
            class_number,
            roll_number
          )
        `)
        .eq('exam_id', selectedExam);
      
      if (error) throw error;
      
      // Filter by class
      const filtered = (data || []).filter(
        (r: any) => r.student?.class_number?.toString() === selectedClass
      );
      
      setRanks(filtered as RankData[]);
      
      // Initialize edited ranks
      const edited: Record<string, number> = {};
      filtered.forEach((r: any) => {
        if (r.rank) edited[r.id] = r.rank;
      });
      setEditedRanks(edited);
      
      // Check for conflicts
      const hasDuplicates = filtered.some((r: any) => r.has_conflict);
      setHasConflicts(hasDuplicates);
    } catch (error) {
      console.error('Error fetching ranks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateRanks = async () => {
    if (!selectedExam) return;
    setIsCalculating(true);
    try {
      const res = await recalculateClassRanks(selectedExam, parseInt(selectedClass));
      toast({
        title: "Ranks calculated",
        description: res.ties > 0
          ? `${res.studentsRanked} ranked. ${res.ties} tie(s) auto-resolved by roll number.`
          : `${res.studentsRanked} ranked. No ties.`,
      });
      fetchRanks();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to calculate ranks" });
    } finally {
      setIsCalculating(false);
    }
  };

  const recalcAllClasses = async () => {
    if (!selectedExam) return;
    setIsCalculating(true);
    try {
      const results = await recalculateAllClasses(selectedExam);
      const total = results.reduce((s, r) => s + r.studentsRanked, 0);
      const ties = results.reduce((s, r) => s + r.ties, 0);
      await supabase.from("activity_logs").insert({
        action: "RANKS_RECALCULATED_ALL",
        details: { exam_id: selectedExam, total_students: total, ties },
      });
      toast({
        title: "All classes recalculated",
        description: `${total} students ranked across classes 5–9. ${ties} tie(s) auto-resolved.`,
      });
      fetchRanks();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to recalculate" });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleRankChange = (rankId: string, value: string) => {
    const numValue = parseInt(value);
    if (numValue > 0) {
      setEditedRanks(prev => ({ ...prev, [rankId]: numValue }));
    }
  };

  const saveRanks = async () => {
    try {
      const updates = Object.entries(editedRanks).map(([id, rank]) => ({
        id,
        rank,
        has_conflict: false, // Manually resolved
      }));

      // Check for duplicate ranks
      const rankValues = Object.values(editedRanks);
      const hasDuplicates = rankValues.length !== new Set(rankValues).size;
      
      if (hasDuplicates) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Duplicate ranks detected. Each student must have a unique rank.",
        });
        return;
      }

      for (const update of updates) {
        const { error } = await supabase
          .from('ranks')
          .update({ rank: update.rank, has_conflict: false })
          .eq('id', update.id);
        
        if (error) throw error;
      }

      toast({ title: "Saved", description: "Ranks saved successfully" });
      fetchRanks();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save ranks",
      });
    }
  };

  const sortedRanks = [...ranks].sort((a, b) => (editedRanks[a.id] || 999) - (editedRanks[b.id] || 999));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">Ranks Management</h2>
        <p className="text-muted-foreground">Calculate and finalize student ranks</p>
      </div>

      {/* Selection Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Examination *</Label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map(exam => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name} ({exam.academic_year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Class *</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Class 5</SelectItem>
                  <SelectItem value="6">Class 6</SelectItem>
                  <SelectItem value="7">Class 7</SelectItem>
                  <SelectItem value="8">Class 8</SelectItem>
                  <SelectItem value="9">Class 9</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-end gap-2 md:col-span-2">
              <Button onClick={calculateRanks} disabled={!selectedExam || isCalculating}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isCalculating ? 'animate-spin' : ''}`} />
                {isCalculating ? "Calculating..." : "Calculate (this class)"}
              </Button>
              <Button
                onClick={recalcAllClasses}
                disabled={!selectedExam || isCalculating}
                variant="secondary"
              >
                <Layers className="mr-2 h-4 w-4" />
                Recalculate All Classes
              </Button>
              {ranks.length > 0 && (
                <Button onClick={saveRanks} variant="outline">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How ranks are computed — info panel */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>How ranks are computed:</strong> students are sorted by{" "}
          <em>total marks (highest first)</em>; ties are broken by the{" "}
          <em>lower roll number getting the higher rank</em>. AB / EX count as 0.
          Pass mark is 25%. Recalculate after any marks change to keep data in sync.
          {hasConflicts && (
            <span className="block mt-1 text-warning">
              ⚠️ {ranks.filter(r => r.has_conflict).length} tie(s) auto-resolved in this class.
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Manual Rank Excel Import (all classes in one file) */}
      {selectedExam && (
        <RanksManualExcelImport
          examId={selectedExam}
          examName={exams.find(e => e.id === selectedExam)?.name}
          onImported={fetchRanks}
        />
      )}

      {/* Tie-resolution notice */}
      {hasConflicts && (
        <Alert>
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription>
            <strong>⚠️ Ties auto-resolved:</strong> Some students share the same total marks.
            Distinct ranks have been assigned using a deterministic rule —
            <em> the student with the lower roll number gets the higher rank</em>.
            Affected rows are flagged with ⚠️. You may override manually if needed.
          </AlertDescription>
        </Alert>
      )}

      {/* Ranks Table */}
      {selectedExam ? (
        <Card>
          <CardHeader>
            <CardTitle>Class {selectedClass} Rank List</CardTitle>
            <CardDescription>
              Review and adjust ranks as needed. Students with same marks are flagged.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : sortedRanks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No rank data available. Calculate ranks first.
              </div>
            ) : (
              <>
                {/* Mobile stacked cards */}
                <div className="md:hidden space-y-3">
                  {sortedRanks.map((rank) => (
                    <div
                      key={rank.id}
                      className={`rounded-xl border p-4 transition-all ${
                        rank.has_conflict ? "bg-warning/10 border-warning/40" : "bg-card border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground">Rank</span>
                            <Input
                              type="number"
                              min="1"
                              className="h-8 w-16 text-center text-sm"
                              value={editedRanks[rank.id] || rank.rank || ""}
                              onChange={(e) => handleRankChange(rank.id, e.target.value)}
                            />
                          </div>
                          <p className="font-semibold text-foreground truncate">{rank.student?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Roll {rank.student?.roll_number} • ID {rank.student?.student_id}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-primary">{rank.percentage.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">{rank.total_marks} marks</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{rank.grade}</Badge>
                        <Badge className={rank.is_passed ? "bg-success" : "bg-destructive"}>
                          {rank.is_passed ? "PASS" : "FAIL"}
                        </Badge>
                        {rank.has_conflict ? (
                          <Badge variant="outline" className="border-warning text-warning text-[10px]">
                            <AlertTriangle className="mr-1 h-3 w-3" /> Tie auto-resolved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-success text-success text-[10px]">
                            <Check className="mr-1 h-3 w-3" /> OK
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table with sticky header */}
                <div className="hidden md:block overflow-x-auto rounded-lg border border-border max-h-[70vh]">
                  <Table className="min-w-[760px]">
                    <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
                      <TableRow>
                        <TableHead className="w-24">Rank</TableHead>
                        <TableHead>Roll</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="text-center">Total Marks</TableHead>
                        <TableHead className="text-center">Percentage</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                        <TableHead className="text-center">Result</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedRanks.map((rank) => (
                        <TableRow key={rank.id} className={rank.has_conflict ? "bg-warning/10" : ""}>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              className="w-16 text-center"
                              value={editedRanks[rank.id] || rank.rank || ''}
                              onChange={(e) => handleRankChange(rank.id, e.target.value)}
                            />
                          </TableCell>
                          <TableCell>{rank.student?.roll_number}</TableCell>
                          <TableCell className="font-medium">{rank.student?.name}</TableCell>
                          <TableCell className="text-center font-semibold">{rank.total_marks}</TableCell>
                          <TableCell className="text-center">{rank.percentage.toFixed(2)}%</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{rank.grade}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={rank.is_passed ? "bg-success" : "bg-destructive"}>
                              {rank.is_passed ? "PASS" : "FAIL"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {rank.has_conflict ? (
                              <Badge
                                variant="outline"
                                className="border-warning text-warning"
                                title="Tie auto-resolved by roll number (lower roll = higher rank)"
                              >
                                <AlertTriangle className="mr-1 h-3 w-3" /> ⚠️ Tie auto-resolved
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-success text-success">
                                <Check className="mr-1 h-3 w-3" /> OK
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select an examination to view and manage ranks.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RanksSection;
