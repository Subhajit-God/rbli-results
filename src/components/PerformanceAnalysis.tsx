import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Target, Brain } from 'lucide-react';
import { useAIChat } from '@/hooks/useAIChat';
import ReactMarkdown from 'react-markdown';

interface Mark {
  subject: string;
  total: number;
  fullTotal: number;
  percentage: number;
}

interface Summary {
  grandTotal: number;
  fullMarks: number;
  percentage: number;
  grade: string;
  isPassed: boolean;
  rank: number;
}

interface PerformanceAnalysisProps {
  studentName: string;
  classNumber: number;
  section: string;
  rollNumber: number;
  examName: string;
  marks: Mark[];
  summary: Summary;
}

const PerformanceAnalysis = ({
  studentName,
  classNumber,
  section,
  rollNumber,
  examName,
  marks,
  summary,
}: PerformanceAnalysisProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { sendMessage, messages, isLoading, clearChat } = useAIChat();

  // Quick insights from data
  const sortedByPercentage = [...marks].sort((a, b) => b.percentage - a.percentage);
  const strongSubjects = sortedByPercentage.filter(m => m.percentage >= 70).slice(0, 3);
  const weakSubjects = sortedByPercentage.filter(m => m.percentage < 50);
  const averageSubjects = sortedByPercentage.filter(m => m.percentage >= 50 && m.percentage < 70);

  const handleGetAnalysis = async () => {
    if (analysis || isLoading) return;
    
    setIsAnalyzing(true);
    clearChat();
    
    const studentData = {
      name: studentName,
      classNumber,
      section,
      rollNumber,
      examName,
      marks,
      summary,
    };

    await sendMessage(
      `Please analyze my exam performance and provide:
      1. A brief overall assessment (2-3 sentences)
      2. My key strengths based on subject performance
      3. Areas that need improvement
      4. 3 specific, actionable study tips for improvement
      5. An encouraging message
      
      Keep it concise and helpful.`,
      studentData
    );
    
    setIsAnalyzing(false);
  };

  // Get the last assistant message as analysis
  const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();

  return (
    <Card className="glass-effect border-primary/30 overflow-hidden print:hidden">
      <CardHeader 
        className="cursor-pointer hover:bg-primary/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Performance Analysis
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Get personalized insights and study recommendations
              </p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-center">
              <TrendingUp className="h-5 w-5 text-green-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Strong</p>
              <p className="font-semibold text-green-600 dark:text-green-400">
                {strongSubjects.length} subjects
              </p>
            </div>
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-center">
              <Target className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Average</p>
              <p className="font-semibold text-yellow-600 dark:text-yellow-400">
                {averageSubjects.length} subjects
              </p>
            </div>
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-center">
              <TrendingDown className="h-5 w-5 text-red-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Needs Work</p>
              <p className="font-semibold text-red-600 dark:text-red-400">
                {weakSubjects.length} subjects
              </p>
            </div>
          </div>

          {/* Subject Highlights */}
          {strongSubjects.length > 0 && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium text-foreground mb-2">🌟 Top Performing Subjects</p>
              <div className="flex flex-wrap gap-2">
                {strongSubjects.map((s, i) => (
                  <span 
                    key={i} 
                    className="text-xs bg-green-500/20 text-green-700 dark:text-green-300 px-2 py-1 rounded-full"
                  >
                    {s.subject} ({s.percentage.toFixed(0)}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          {weakSubjects.length > 0 && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium text-foreground mb-2">📚 Focus Areas</p>
              <div className="flex flex-wrap gap-2">
                {weakSubjects.map((s, i) => (
                  <span 
                    key={i} 
                    className="text-xs bg-red-500/20 text-red-700 dark:text-red-300 px-2 py-1 rounded-full"
                  >
                    {s.subject} ({s.percentage.toFixed(0)}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {!lastAssistantMessage?.content ? (
            <Button
              onClick={handleGetAnalysis}
              disabled={isLoading}
              className="w-full gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Analyzing your performance...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Get AI-Powered Insights
                </>
              )}
            </Button>
          ) : (
            <div className="rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">AI Analysis</span>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1">{children}</ol>,
                    li: ({ children }) => <li>{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                    h1: ({ children }) => <h4 className="font-semibold text-foreground mb-2">{children}</h4>,
                    h2: ({ children }) => <h4 className="font-semibold text-foreground mb-2">{children}</h4>,
                    h3: ({ children }) => <h4 className="font-semibold text-foreground mb-2">{children}</h4>,
                  }}
                >
                  {lastAssistantMessage.content}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default PerformanceAnalysis;
