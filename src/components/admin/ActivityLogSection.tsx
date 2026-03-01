import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  History, Search, Filter, RefreshCw, ChevronLeft, ChevronRight,
  LogIn, LogOut, Edit, Lock, Unlock, Rocket, RotateCcw, Trash2, 
  UserPlus, BookOpen, Shield, Database, AlertTriangle
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { Json } from "@/integrations/supabase/types";

interface ActivityLog {
  id: string;
  action: string;
  details: Json | null;
  created_at: string;
  user_id: string | null;
}

const ACTION_ICONS: Record<string, typeof History> = {
  login: LogIn,
  logout: LogOut,
  marks_edit: Edit,
  marks_lock: Lock,
  marks_unlock: Unlock,
  deploy: Rocket,
  rollback: RotateCcw,
  delete: Trash2,
  student_add: UserPlus,
  subject_change: BookOpen,
  admin_action: Shield,
  reset: Database,
};

const ACTION_COLORS: Record<string, string> = {
  login: "bg-success/15 text-success border-success/30",
  logout: "bg-muted text-muted-foreground border-border",
  marks_edit: "bg-primary/15 text-primary border-primary/30",
  marks_lock: "bg-warning/15 text-warning border-warning/30",
  marks_unlock: "bg-accent/15 text-accent border-accent/30",
  deploy: "bg-success/15 text-success border-success/30",
  rollback: "bg-warning/15 text-warning border-warning/30",
  delete: "bg-destructive/15 text-destructive border-destructive/30",
  reset: "bg-destructive/15 text-destructive border-destructive/30",
};

const getActionIcon = (action: string) => {
  const key = Object.keys(ACTION_ICONS).find(k => action.toLowerCase().includes(k));
  return ACTION_ICONS[key || ""] || History;
};

const getActionColor = (action: string) => {
  const key = Object.keys(ACTION_COLORS).find(k => action.toLowerCase().includes(k));
  return ACTION_COLORS[key || ""] || "bg-muted text-muted-foreground border-border";
};

const PAGE_SIZE = 20;

const ActivityLogSection = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filterAction && filterAction !== "all") {
        query = query.ilike('action', `%${filterAction}%`);
      }

      if (searchQuery) {
        query = query.or(`action.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filterAction, searchQuery]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const formatDetails = (details: Json | null): string => {
    if (!details) return "";
    if (typeof details === "string") return details;
    if (typeof details === "object" && details !== null) {
      return Object.entries(details as Record<string, unknown>)
        .map(([key, value]) => `${key}: ${value}`)
        .join(" · ");
    }
    return String(details);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Activity Log</h2>
        <p className="text-muted-foreground">Track all administrative actions and changes</p>
      </div>

      {/* Filters */}
      <Card className="glass-effect">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search actions..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="marks">Marks</SelectItem>
                <SelectItem value="deploy">Deploy</SelectItem>
                <SelectItem value="lock">Lock/Unlock</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="reset">Reset</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchLogs} className="shrink-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Log Timeline */}
      <Card className="glass-effect">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {totalCount} total
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No activity logs found</p>
              <p className="text-sm text-muted-foreground mt-1">Actions will appear here as you use the admin panel.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-1">
                {logs.map((log, index) => {
                  const Icon = getActionIcon(log.action);
                  const colorClass = getActionColor(log.action);
                  const details = formatDetails(log.details);

                  return (
                    <div 
                      key={log.id}
                      className={cn(
                        "relative flex items-start gap-4 p-3 rounded-lg transition-colors hover:bg-muted/30",
                        index === 0 && "bg-muted/20"
                      )}
                    >
                      {/* Icon */}
                      <div className={cn(
                        "relative z-10 flex items-center justify-center h-10 w-10 rounded-full border shrink-0",
                        colorClass
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm text-foreground">{log.action}</p>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {details && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{details}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {format(new Date(log.created_at), "MMM d, yyyy · h:mm:ss a")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLogSection;
