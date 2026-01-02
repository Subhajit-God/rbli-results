import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Trash2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SettingsSection = () => {
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetCheckbox, setResetCheckbox] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const canReset = 
    resetPassword.length >= 6 && 
    resetConfirmText === "RESET DATABASE" && 
    resetCheckbox;

  const handleReset = async () => {
    setResetError("");
    setIsResetting(true);

    try {
      // Verify password
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Re-authenticate to verify password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: resetPassword,
      });

      if (authError) {
        setResetError("Incorrect password. Please try again.");
        setIsResetting(false);
        return;
      }

      // Delete all data in order (respecting foreign keys)
      await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('deployment_status').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('ranks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('marks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('exams').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('admin_roles').delete().eq('user_id', user.id);

      // Sign out
      await supabase.auth.signOut();

      toast({
        title: "Database Reset Complete",
        description: "All data has been deleted. You have been logged out.",
      });

      navigate('/admin/auth');
    } catch (error: any) {
      setResetError(error.message || "Failed to reset database");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">System configuration and maintenance</p>
      </div>

      {/* Activity Logs Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity Logs
          </CardTitle>
          <CardDescription>
            All administrative actions are automatically logged for audit purposes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Logged actions include: login/logout, marks edits, marks lock/unlock, rank changes, deploy/rollback, and database reset.
          </p>
        </CardContent>
      </Card>

      {/* Database Reset */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect your entire database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Resetting the database will permanently delete ALL data including students, subjects, exams, marks, results, ranks, configurations, and your admin account. This action cannot be undone.
            </AlertDescription>
          </Alert>

          <Button 
            variant="destructive" 
            onClick={() => setShowResetDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Reset the Database
          </Button>
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              ⚠️ Full Database Reset
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                This will permanently delete:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>ALL students</li>
                <li>ALL subjects</li>
                <li>ALL examinations</li>
                <li>ALL marks</li>
                <li>ALL results and ranks</li>
                <li>ALL activity logs</li>
                <li>Your admin account</li>
              </ul>
              <p className="font-semibold text-destructive">
                This action CANNOT be undone!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            {resetError && (
              <Alert variant="destructive">
                <AlertDescription>{resetError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="reset-password">Enter your password to confirm</Label>
              <Input
                id="reset-password"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Your password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-confirm">Type "RESET DATABASE" to confirm</Label>
              <Input
                id="reset-confirm"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="RESET DATABASE"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="reset-checkbox"
                checked={resetCheckbox}
                onCheckedChange={(checked) => setResetCheckbox(checked as boolean)}
              />
              <label
                htmlFor="reset-checkbox"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I understand this action is irreversible
              </label>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setResetPassword("");
              setResetConfirmText("");
              setResetCheckbox(false);
              setResetError("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={!canReset || isResetting}
              className="bg-destructive text-destructive-foreground"
            >
              {isResetting ? "Resetting..." : "Reset Everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsSection;
