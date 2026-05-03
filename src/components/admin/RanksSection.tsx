import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Save, AlertTriangle, Check, X } from "lucide-react";
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
      // Get all students for selected class
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('class_number', parseInt(selectedClass));

      if (studentsError) throw studentsError;

      // Get all marks for this exam
      const { data: marks, error: marksError } = await supabase
        .from('marks')
        .select(`
          *,
          subjects:subject_id (
            full_marks_1,
            full_marks_2,
            full_marks_3,
            class_number
          )
        `)
        .eq('exam_id', selectedExam);

      if (marksError) throw marksError;

      // Calculate totals for each student
      const studentTotals: Record<string, { total: number; fullMarks: number }> = {};
      
      marks?.forEach((mark: any) => {
        if (mark.subjects?.class_number?.toString() !== selectedClass) return;
        
        if (!studentTotals[mark.student_id]) {
          studentTotals[mark.student_id] = { total: 0, fullMarks: 0 };
        }
        
        const m1 = ['AB', 'EX'].includes(mark.marks_1?.toUpperCase() || '') ? 0 : parseFloat(mark.marks_1) || 0;
        const m2 = ['AB', 'EX'].includes(mark.marks_2?.toUpperCase() || '') ? 0 : parseFloat(mark.marks_2) || 0;
        const m3 = ['AB', 'EX'].includes(mark.marks_3?.toUpperCase() || '') ? 0 : parseFloat(mark.marks_3) || 0;
        
        studentTotals[mark.student_id].total += m1 + m2 + m3;
        studentTotals[mark.student_id].fullMarks += 
          (mark.subjects?.full_marks_1 || 0) + 
          (mark.subjects?.full_marks_2 || 0) + 
          (mark.subjects?.full_marks_3 || 0);
      });

      // Sort by total marks (descending)
      const sortedStudents = Object.entries(studentTotals)
        .sort(([, a], [, b]) => b.total - a.total);

      // Detect conflicts (same total marks)
      const totalCounts: Record<number, number> = {};
      sortedStudents.forEach(([, { total }]) => {
        totalCounts[total] = (totalCounts[total] || 0) + 1;
      });

      // Assign ranks and upsert
      const rankUpserts = sortedStudents.map(([studentId, { total, fullMarks }], index) => {
        const percentage = fullMarks > 0 ? (total / fullMarks) * 100 : 0;
        const grade = getGrade(percentage);
        const isPassed = percentage >= 25; // Minimum C grade
        const hasConflict = totalCounts[total] > 1;
        
        return {
          student_id: studentId,
          exam_id: selectedExam,
          total_marks: total,
          percentage: parseFloat(percentage.toFixed(2)),
          grade,
          rank: index + 1,
          is_passed: isPassed,
          has_conflict: hasConflict,
        };
      });

      const { error: upsertError } = await supabase
        .from('ranks')
        .upsert(rankUpserts, { onConflict: 'student_id,exam_id' });

      if (upsertError) throw upsertError;

      toast({ title: "Success", description: "Ranks calculated successfully" });
      fetchRanks();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to calculate ranks",
      });
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
        <h2 className="text-2xl font-bold">Ranks Management</h2>
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

            <div className="flex items-end gap-2 md:col-span-2">
              <Button onClick={calculateRanks} disabled={!selectedExam || isCalculating}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isCalculating ? 'animate-spin' : ''}`} />
                {isCalculating ? "Calculating..." : "Calculate Ranks"}
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

      {/* Conflict Warning */}
      {hasConflicts && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Some students have the same total marks. Please manually assign ranks to resolve conflicts before deploying.
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
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
                            <Badge variant="outline" className="border-warning text-warning">
                              <AlertTriangle className="mr-1 h-3 w-3" /> Conflict
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
