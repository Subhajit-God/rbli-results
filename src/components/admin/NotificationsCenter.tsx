import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, AlertTriangle, CheckCircle2, Info, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: "warning" | "success" | "info";
  title: string;
  description: string;
  time: Date;
}

const NotificationsCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const items: Notification[] = [];

    // Check for rank conflicts
    const { data: conflicts } = await supabase
      .from("ranks")
      .select("id, students(name, class_number)")
      .eq("has_conflict", true)
      .limit(5);

    if (conflicts && conflicts.length > 0) {
      items.push({
        id: "conflicts",
        type: "warning",
        title: "Rank Conflicts",
        description: `${conflicts.length} unresolved rank conflict(s) need attention.`,
        time: new Date(),
      });
    }

    // Check for unlocked marks
    const { data: unlocked } = await supabase
      .from("marks")
      .select("id")
      .eq("is_locked", false)
      .limit(1);

    if (unlocked && unlocked.length > 0) {
      items.push({
        id: "unlocked",
        type: "info",
        title: "Unlocked Marks",
        description: "Some marks are still unlocked. Lock them before finalizing ranks.",
        time: new Date(),
      });
    }

    // Recent activity
    const { data: logs } = await supabase
      .from("activity_logs")
      .select("id, action, created_at, details")
      .order("created_at", { ascending: false })
      .limit(5);

    if (logs) {
      logs.forEach((log) => {
        items.push({
          id: log.id,
          type: "success",
          title: log.action.replace(/_/g, " "),
          description: `Action performed ${formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}`,
          time: new Date(log.created_at),
        });
      });
    }

    setNotifications(items);
  };

  const warningCount = notifications.filter((n) => n.type === "warning").length;

  const getIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {warningCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
              <Badge className="relative h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground rounded-full">
                {warningCount}
              </Badge>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
          <p className="text-xs text-muted-foreground">{notifications.length} items</p>
        </div>
        <ScrollArea className="max-h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 p-3 transition-colors hover:bg-muted/50",
                    n.type === "warning" && "bg-warning/5"
                  )}
                >
                  <div className="mt-0.5">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
                  </div>
                  <Clock className="h-3 w-3 text-muted-foreground mt-1 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsCenter;
