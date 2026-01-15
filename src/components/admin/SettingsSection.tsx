import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Trash2, History, UserX, Loader2, Download, Upload } from "lucide-react";
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
  const [showDeleteAdminDialog, setShowDeleteAdminDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetCheckbox, setResetCheckbox] = useState(false);
  const [deleteAdminPassword, setDeleteAdminPassword] = useState("");
  const [deleteAdminConfirmText, setDeleteAdminConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [isDeletingAdmin, setIsDeletingAdmin] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [deleteAdminError, setDeleteAdminError] = useState("");
  const [importError, setImportError] = useState("");
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupPreview, setBackupPreview] = useState<{
    exportedAt: string;
    summary: {
      studentsCount: number;
      subjectsCount: number;
      examsCount: number;
      marksCount: number;
      ranksCount: number;
      activityLogsCount: number;
    };
  } | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // Fetch all data from all tables
      const [studentsRes, subjectsRes, examsRes, marksRes, ranksRes, activityLogsRes] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('subjects').select('*'),
        supabase.from('exams').select('*'),
        supabase.from('marks').select('*'),
        supabase.from('ranks').select('*'),
        supabase.from('activity_logs').select('*'),
      ]);

      const backupData = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        data: {
          students: studentsRes.data || [],
          subjects: subjectsRes.data || [],
          exams: examsRes.data || [],
          marks: marksRes.data || [],
          ranks: ranksRes.data || [],
          activity_logs: activityLogsRes.data || [],
        },
        summary: {
          studentsCount: studentsRes.data?.length || 0,
          subjectsCount: subjectsRes.data?.length || 0,
          examsCount: examsRes.data?.length || 0,
          marksCount: marksRes.data?.length || 0,
          ranksCount: ranksRes.data?.length || 0,
          activityLogsCount: activityLogsRes.data?.length || 0,
        }
      };

      // Create and download the JSON file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rbli-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Backup Downloaded",
        description: `Exported ${backupData.summary.studentsCount} students, ${backupData.summary.examsCount} exams, ${backupData.summary.marksCount} marks.`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError("");
    setBackupPreview(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate backup structure
      if (!data.version || !data.data || !data.summary) {
        throw new Error("Invalid backup file format");
      }

      if (!data.data.students || !data.data.subjects || !data.data.exams) {
        throw new Error("Backup file is missing required data tables");
      }

      setBackupFile(file);
      setBackupPreview({
        exportedAt: data.exportedAt,
        summary: data.summary,
      });
      setShowImportDialog(true);
    } catch (error: any) {
      setImportError(error.message || "Failed to parse backup file");
      toast({
        title: "Invalid Backup File",
        description: error.message || "Could not read the backup file",
        variant: "destructive",
      });
    }

    // Reset file input
    event.target.value = "";
  };

  const handleImportData = async () => {
    if (!backupFile) return;

    setIsImporting(true);
    setImportError("");

    try {
      const text = await backupFile.text();
      const backupData = JSON.parse(text);

      // Clear existing data first (respecting foreign keys)
      await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('deployment_status').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('ranks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('marks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('exams').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Import data in correct order (respecting foreign keys)
      // 1. Independent tables first
      if (backupData.data.subjects?.length > 0) {
        const { error } = await supabase.from('subjects').insert(backupData.data.subjects);
        if (error) throw new Error(`Failed to import subjects: ${error.message}`);
      }

      if (backupData.data.students?.length > 0) {
        const { error } = await supabase.from('students').insert(backupData.data.students);
        if (error) throw new Error(`Failed to import students: ${error.message}`);
      }

      if (backupData.data.exams?.length > 0) {
        const { error } = await supabase.from('exams').insert(backupData.data.exams);
        if (error) throw new Error(`Failed to import exams: ${error.message}`);
      }

      // 2. Dependent tables
      if (backupData.data.marks?.length > 0) {
        const { error } = await supabase.from('marks').insert(backupData.data.marks);
        if (error) throw new Error(`Failed to import marks: ${error.message}`);
      }

      if (backupData.data.ranks?.length > 0) {
        const { error } = await supabase.from('ranks').insert(backupData.data.ranks);
        if (error) throw new Error(`Failed to import ranks: ${error.message}`);
      }

      // Activity logs are optional - don't fail if they can't be imported
      if (backupData.data.activity_logs?.length > 0) {
        await supabase.from('activity_logs').insert(backupData.data.activity_logs);
      }

      toast({
        title: "Import Successful",
        description: `Restored ${backupData.summary.studentsCount} students, ${backupData.summary.examsCount} exams, ${backupData.summary.marksCount} marks.`,
      });

      setShowImportDialog(false);
      setBackupFile(null);
      setBackupPreview(null);
    } catch (error: any) {
      setImportError(error.message || "Failed to import data");
    } finally {
      setIsImporting(false);
    }
  };

  const canReset = 
    resetPassword.length >= 6 && 
    resetConfirmText === "RESET DATABASE" && 
    resetCheckbox;

  const canDeleteAdmin = 
    deleteAdminPassword.length >= 6 && 
    deleteAdminConfirmText === "DELETE ADMIN";

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
      // Delete ALL admin roles (not just current user) to allow new registration
      await supabase.from('admin_roles').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Delete the auth user account via edge function
      const { error: deleteUserError } = await supabase.functions.invoke('delete-user', {
        body: { userId: user.id }
      });

      if (deleteUserError) {
        console.error('Failed to delete auth user:', deleteUserError);
        // Continue anyway - data is deleted, just auth user remains
      }

      // Sign out (in case delete-user didn't fully clear session)
      await supabase.auth.signOut();

      toast({
        title: "Database Reset Complete",
        description: "All data and your account have been deleted.",
      });

      navigate('/admin/auth');
    } catch (error: any) {
      setResetError(error.message || "Failed to reset database");
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteAdminAccount = async () => {
    setDeleteAdminError("");
    setIsDeletingAdmin(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Re-authenticate to verify password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: deleteAdminPassword,
      });

      if (authError) {
        setDeleteAdminError("Incorrect password. Please try again.");
        setIsDeletingAdmin(false);
        return;
      }

      // Delete admin role only (keep all data intact)
      const { error: deleteError } = await supabase
        .from('admin_roles')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Sign out
      await supabase.auth.signOut();

      toast({
        title: "Admin Account Deleted",
        description: "Your admin account has been removed. A new admin can now register.",
      });

      // Redirect to auth page where registration will be available
      navigate('/admin/auth');
    } catch (error: any) {
      setDeleteAdminError(error.message || "Failed to delete admin account");
    } finally {
      setIsDeletingAdmin(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">System configuration and maintenance</p>
      </div>

      {/* Backup & Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Backup & Export
          </CardTitle>
          <CardDescription>
            Download a complete backup of all your data before making any changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Export Data</p>
              <p className="text-xs text-muted-foreground">
                Download all data as a JSON backup file.
              </p>
              <Button onClick={handleExportData} disabled={isExporting} className="w-full">
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download Backup
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Import Data</p>
              <p className="text-xs text-muted-foreground">
                Restore data from a backup JSON file.
              </p>
              <div className="relative">
                <Input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="backup-file-input"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById('backup-file-input')?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import Backup
                </Button>
              </div>
              {importError && (
                <p className="text-xs text-destructive">{importError}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect your account and database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Delete Admin Account */}
          <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/5">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-destructive/10">
                <UserX className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">Delete My Admin Account</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Remove your admin account while keeping all data intact. This allows a new administrator to register.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-3 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setShowDeleteAdminDialog(true)}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Delete My Admin Account
                </Button>
              </div>
            </div>
          </div>

          {/* Full Database Reset */}
          <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/5">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">Reset the Database</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Permanently delete ALL data including students, subjects, exams, marks, results, ranks, and your admin account.
                </p>
                <Alert variant="destructive" className="mt-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This action cannot be undone. All data will be permanently deleted.
                  </AlertDescription>
                </Alert>
                <Button 
                  variant="destructive" 
                  className="mt-3"
                  onClick={() => setShowResetDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Reset the Database
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Admin Confirmation Dialog */}
      <AlertDialog open={showDeleteAdminDialog} onOpenChange={setShowDeleteAdminDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <UserX className="h-5 w-5" />
              Delete Admin Account
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This will permanently remove your admin account.</p>
              <p className="font-medium">What will happen:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Your admin role will be removed</li>
                <li>You will be logged out immediately</li>
                <li>Registration will be re-enabled for a new admin</li>
                <li><strong>All data (students, marks, subjects) will remain intact</strong></li>
              </ul>
              <p className="text-warning-foreground font-semibold">
                This action is permanent and cannot be undone!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            {deleteAdminError && (
              <Alert variant="destructive">
                <AlertDescription>{deleteAdminError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="delete-admin-password">Enter your password to confirm</Label>
              <Input
                id="delete-admin-password"
                type="password"
                value={deleteAdminPassword}
                onChange={(e) => setDeleteAdminPassword(e.target.value)}
                placeholder="Your password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delete-admin-confirm">Type "DELETE ADMIN" to confirm</Label>
              <Input
                id="delete-admin-confirm"
                value={deleteAdminConfirmText}
                onChange={(e) => setDeleteAdminConfirmText(e.target.value.toUpperCase())}
                placeholder="DELETE ADMIN"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteAdminPassword("");
              setDeleteAdminConfirmText("");
              setDeleteAdminError("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAdminAccount}
              disabled={!canDeleteAdmin || isDeletingAdmin}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingAdmin ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete My Admin Account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Everything"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Confirmation Dialog */}
      <AlertDialog open={showImportDialog} onOpenChange={(open) => {
        setShowImportDialog(open);
        if (!open) {
          setBackupFile(null);
          setBackupPreview(null);
          setImportError("");
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Restore from Backup
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>You are about to restore data from a backup file.</p>
              {backupPreview && (
                <div className="bg-muted p-3 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Backup Details:</p>
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(backupPreview.exportedAt).toLocaleString()}
                  </p>
                  <ul className="text-xs space-y-1">
                    <li>• {backupPreview.summary.studentsCount} students</li>
                    <li>• {backupPreview.summary.subjectsCount} subjects</li>
                    <li>• {backupPreview.summary.examsCount} exams</li>
                    <li>• {backupPreview.summary.marksCount} marks</li>
                    <li>• {backupPreview.summary.ranksCount} ranks</li>
                  </ul>
                </div>
              )}
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This will replace ALL current data with the backup data. This action cannot be undone!
                </AlertDescription>
              </Alert>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {importError && (
            <Alert variant="destructive">
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleImportData}
              disabled={isImporting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Restore Data"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsSection;
