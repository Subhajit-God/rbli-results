import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, Session } from "@supabase/supabase-js";
import {
  Users,
  BookOpen,
  ClipboardList,
  Award,
  Settings,
  LogOut,
  Menu,
  X,
  GraduationCap,
  FileText,
  AlertTriangle,
  Rocket,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import schoolLogo from "@/assets/school-logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DashboardStatsSkeleton } from "@/components/ui/result-skeleton";
import FloatingShapes from "@/components/FloatingShapes";
import DeploymentOverlay from "@/components/admin/DeploymentOverlay";
import CurrentYearBanner from "@/components/admin/CurrentYearBanner";
import { useDeploymentStatus } from "@/hooks/useDeploymentStatus";
import { useCurrentAcademicYear } from "@/hooks/useCurrentAcademicYear";

// Import dashboard sections
import StudentsSection from "@/components/admin/StudentsSection";
import SubjectsSection from "@/components/admin/SubjectsSection";
import ExamsSection from "@/components/admin/ExamsSection";
import MarksSection from "@/components/admin/MarksSection";
import RanksSection from "@/components/admin/RanksSection";
import DeploySection from "@/components/admin/DeploySection";
import SettingsSection from "@/components/admin/SettingsSection";
import VerifySection from "@/components/admin/VerifySection";

type Section = "overview" | "students" | "subjects" | "exams" | "marks" | "ranks" | "deploy" | "verify" | "settings";

// Sections that should be blocked when results are deployed
const blockedSections: Section[] = ["overview", "students", "subjects", "marks", "ranks", "verify", "settings"];

const navItems = [
  { id: "overview" as Section, label: "Overview", icon: GraduationCap },
  { id: "students" as Section, label: "Students", icon: Users },
  { id: "subjects" as Section, label: "Subjects", icon: BookOpen },
  { id: "exams" as Section, label: "Academic Year", icon: FileText },
  { id: "marks" as Section, label: "Marks Entry", icon: ClipboardList },
  { id: "ranks" as Section, label: "Ranks", icon: Award },
  { id: "deploy" as Section, label: "Deploy", icon: Rocket },
  { id: "verify" as Section, label: "Verify", icon: ShieldCheck },
  { id: "settings" as Section, label: "Settings", icon: Settings },
];

const AdminDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalSubjects: 0,
    totalExams: 0,
    deployedExams: 0,
  });

  const { hasDeployedExam, deployedExam, refetch: refetchDeploymentStatus } = useDeploymentStatus();
  const { currentYear, refetch: refetchCurrentYear } = useCurrentAcademicYear();
  
  // Check if current section should show the deployment overlay
  const showDeploymentOverlay = hasDeployedExam && blockedSections.includes(activeSection);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate('/admin/auth');
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate('/admin/auth');
      } else {
        // Verify admin role
        setTimeout(() => {
          checkAdminRole(session.user.id);
        }, 0);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const checkAdminRole = async (userId: string) => {
    const { data: adminRole, error } = await supabase
      .from('admin_roles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !adminRole) {
      await supabase.auth.signOut();
      navigate('/admin/auth');
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You are not authorized as an administrator.",
      });
    }
  };

  const fetchStats = async () => {
    setIsStatsLoading(true);
    try {
      const [studentsRes, subjectsRes, examsRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('subjects').select('id', { count: 'exact', head: true }),
        supabase.from('exams').select('id, is_deployed'),
      ]);

      setStats({
        totalStudents: studentsRes.count || 0,
        totalSubjects: subjectsRes.count || 0,
        totalExams: examsRes.data?.length || 0,
        deployedExams: examsRes.data?.filter(e => e.is_deployed).length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsStatsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <FloatingShapes />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin neon-glow" />
          <p className="text-muted-foreground animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const currentNavItem = navItems.find(i => i.id === activeSection);

  const renderSection = () => {
    switch (activeSection) {
      case "students":
        return <StudentsSection />;
      case "subjects":
        return <SubjectsSection />;
      case "exams":
        return <ExamsSection onDeploymentChange={() => { refetchDeploymentStatus(); refetchCurrentYear(); }} />;
      case "marks":
        return <MarksSection />;
      case "ranks":
        return <RanksSection />;
      case "deploy":
        return <DeploySection />;
      case "verify":
        return <VerifySection />;
      case "settings":
        return <SettingsSection />;
      default:
        return (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold text-foreground text-glow">Dashboard Overview</h2>
              <p className="text-muted-foreground">Manage your school's examination system</p>
            </div>

            {/* Stats Cards */}
            {isStatsLoading ? (
              <DashboardStatsSkeleton />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="glass-effect neon-border transition-all duration-200 hover:shadow-official hover:scale-[1.02]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                    <Users className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-glow">{stats.totalStudents}</div>
                    <p className="text-xs text-muted-foreground">Class 5 - Class 9</p>
                  </CardContent>
                </Card>

                <Card className="glass-effect neon-border transition-all duration-200 hover:shadow-official hover:scale-[1.02]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Subjects</CardTitle>
                    <BookOpen className="h-4 w-4 text-secondary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-glow-green">{stats.totalSubjects}</div>
                    <p className="text-xs text-muted-foreground">Across all classes</p>
                  </CardContent>
                </Card>

                <Card className="glass-effect neon-border transition-all duration-200 hover:shadow-official hover:scale-[1.02]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
                    <FileText className="h-4 w-4 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalExams}</div>
                    <p className="text-xs text-muted-foreground">Summative evaluations</p>
                  </CardContent>
                </Card>

                <Card className="glass-effect neon-border transition-all duration-200 hover:shadow-official hover:scale-[1.02]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Deployed</CardTitle>
                    <Rocket className="h-4 w-4 text-warning" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-glow-orange">{stats.deployedExams}</div>
                    <p className="text-xs text-muted-foreground">Results published</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quick Actions */}
            <Card className="glass-effect neon-border">
              <CardHeader>
                <CardTitle className="text-glow">Quick Actions</CardTitle>
                <CardDescription>Common tasks for result management</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto flex-col py-4 gap-2 transition-all duration-200 hover:scale-105 hover:neon-glow border-primary/30"
                  onClick={() => setActiveSection("students")}
                >
                  <Users className="h-6 w-6 text-primary" />
                  <span>Add Students</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto flex-col py-4 gap-2 transition-all duration-200 hover:scale-105 hover:green-glow border-secondary/30"
                  onClick={() => setActiveSection("marks")}
                >
                  <ClipboardList className="h-6 w-6 text-secondary" />
                  <span>Enter Marks</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto flex-col py-4 gap-2 transition-all duration-200 hover:scale-105 hover:shadow-official border-accent/30"
                  onClick={() => setActiveSection("ranks")}
                >
                  <Award className="h-6 w-6 text-accent" />
                  <span>Finalize Ranks</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto flex-col py-4 gap-2 transition-all duration-200 hover:scale-105 hover:orange-glow border-warning/30"
                  onClick={() => setActiveSection("deploy")}
                >
                  <Rocket className="h-6 w-6 text-warning" />
                  <span>Deploy Results</span>
                </Button>
              </CardContent>
            </Card>

            {/* Workflow Guide */}
            <Card className="glass-effect border-warning/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <span className="text-glow-orange">Result Publishing Workflow</span>
                </CardTitle>
                <CardDescription>Follow these steps to publish examination results</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li className="transition-colors hover:text-foreground">Add all students with their details (Student ID, Name, Class, etc.)</li>
                  <li className="transition-colors hover:text-foreground">Configure subjects and full marks for each class</li>
                  <li className="transition-colors hover:text-foreground">Create an examination (1st, 2nd, or 3rd Summative Evaluation)</li>
                  <li className="transition-colors hover:text-foreground">Enter marks for all students in each subject</li>
                  <li className="transition-colors hover:text-foreground">Lock marks to prevent accidental changes</li>
                  <li className="transition-colors hover:text-foreground">Review and finalize ranks (resolve any ties manually)</li>
                  <li className="transition-colors hover:text-foreground">Deploy results to make them visible to students</li>
                </ol>
              </CardContent>
            </Card>

            {/* Footer Attribution */}
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground">Excellence in Education Since 1925</p>
              <p className="text-xs text-primary font-bold text-glow">Made With ❤️ By Subhajit Das Whose ID is 04070122000103</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex transition-colors duration-300 relative overflow-hidden">
      {/* Futuristic Background */}
      <FloatingShapes />
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 glass-effect border-r border-primary/20 transform transition-all duration-300 ease-in-out",
          "lg:translate-x-0 lg:static",
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          isSidebarCollapsed ? 'lg:w-16' : 'w-64'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-primary/20">
            <div className="flex items-center gap-3">
              <img src={schoolLogo} alt="Logo" className="w-10 h-10 rounded-full flex-shrink-0" />
              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0 animate-fade-in">
                  <h2 className="text-sm font-semibold text-foreground truncate">
                    RBI Admin
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden flex-shrink-0"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return isSidebarCollapsed ? (
                <Tooltip key={item.id} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setActiveSection(item.id);
                        setIsSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-center p-3 rounded-md transition-all duration-200",
                        isActive 
                          ? 'bg-primary text-primary-foreground shadow-md' 
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Collapse Toggle (Desktop) */}
          <div className="hidden lg:block p-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
          </div>

          {/* Logout */}
          <div className="p-2 border-t border-border">
            {isSidebarCollapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full text-muted-foreground hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Logout
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-destructive transition-colors"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              {/* Breadcrumb */}
              <Breadcrumb 
                items={[
                  { label: "Admin", href: "/admin/dashboard" },
                  { label: currentNavItem?.label || "Dashboard" }
                ]}
              />
            </div>
            <ThemeToggle />
            <Badge variant="outline" className="text-xs hidden sm:flex">
              Admin
            </Badge>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-4 md:p-6 overflow-auto relative">
          {/* Current Academic Year Banner - shown on all sections except exams */}
          {activeSection !== "exams" && (
            <div className="mb-4">
              <CurrentYearBanner 
                academicYear={currentYear?.academic_year || null}
                examName={currentYear?.name}
              />
            </div>
          )}
          
          {showDeploymentOverlay && (
            <DeploymentOverlay 
              onNavigateToAcademicYear={() => setActiveSection("exams")}
              deployedYear={deployedExam?.academic_year}
            />
          )}
          {renderSection()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
