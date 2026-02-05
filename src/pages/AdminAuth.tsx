import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, Loader2, Eye, EyeOff, ShieldAlert, ShieldCheck } from "lucide-react";
import ResultHeader from "@/components/ResultHeader";
import FloatingShapes from "@/components/FloatingShapes";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const AdminAuth = () => {
  // Determine initial tab based on adminExists - will be updated in useEffect
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { adminExists, isLoading: isCheckingAdmin } = useAdminCheck();

  useEffect(() => {
    // Check if already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if user is admin
        const { data: adminRole } = await supabase
          .from('admin_roles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        if (adminRole) {
          navigate('/admin/dashboard');
        }
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Check admin role and redirect
          const { data: adminRole } = await supabase
            .from('admin_roles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
          
          if (adminRole) {
            navigate('/admin/dashboard');
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Auto-switch to login tab if admin exists
  useEffect(() => {
    // Force login-only mode when admin exists
    if (adminExists === true) {
      setActiveTab("login");
    }
  }, [adminExists, activeTab]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const validatedData = loginSchema.parse({
        email: formData.email,
        password: formData.password,
      });

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please try again.");
        } else {
          setError(authError.message);
        }
        return;
      }

      if (data.user) {
        // Check if user is admin
        const { data: adminRole, error: roleError } = await supabase
          .from('admin_roles')
          .select('*')
          .eq('user_id', data.user.id)
          .single();

        if (roleError || !adminRole) {
          await supabase.auth.signOut();
          setError("You are not authorized as an administrator.");
          return;
        }

        toast({
          title: "Login Successful",
          description: "Welcome back, Admin!",
        });
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            errors[e.path[0] as string] = e.message;
          }
        });
        setFieldErrors(errors);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Double-check at submission time
    if (adminExists) {
      setError("Admin account already exists. Registration is disabled.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const validatedData = registerSchema.parse(formData);

      // Final backend check before registration
      const { count } = await supabase
        .from('admin_roles')
        .select('*', { count: 'exact', head: true });

      if ((count ?? 0) > 0) {
        setError("Admin account already exists. Registration is disabled.");
        setIsLoading(false);
        return;
      }

      const redirectUrl = `${window.location.origin}/admin/dashboard`;

      const { data, error: authError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setError("This email is already registered. Please login instead.");
        } else {
          setError(authError.message);
        }
        return;
      }

      if (data.user) {
        // Add admin role for new user
        const { error: roleError } = await supabase
          .from('admin_roles')
          .insert({ user_id: data.user.id, role: 'admin' });

        if (roleError) {
          console.error('Error adding admin role:', roleError);
        }

        toast({
          title: "Registration Successful",
          description: "Your admin account has been created. You can now login.",
        });
        setActiveTab("login");
        setFormData({ email: validatedData.email, password: "", confirmPassword: "" });
      }
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            errors[e.path[0] as string] = e.message;
          }
        });
        setFieldErrors(errors);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <FloatingShapes />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking system status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <FloatingShapes />
      <div className="relative z-10">
        <ResultHeader />
      </div>
      
      <main className="flex-1 container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-md mx-auto">
          <Button
            variant="ghost"
            className="mb-4 hover:neon-glow"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Results
          </Button>

          <Card className="glass-effect neon-border animate-glow">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-foreground text-glow">Admin Portal</CardTitle>
              <CardDescription>
                {adminExists 
                  ? "Sign in to access the admin dashboard" 
                  : "Create the first admin account to get started"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Registration Blocked Notice */}
              {adminExists && (
                <Alert className="mb-6 border-warning/50 bg-warning/10">
                  <ShieldAlert className="h-4 w-4 text-warning" />
                  <AlertDescription className="text-warning-foreground">
                    Admin account already exists. Registration is disabled. Only login is available.
                  </AlertDescription>
                </Alert>
              )}

              {/* First Admin Notice */}
              {adminExists === false && (
                <Alert className="mb-6 border-success/50 bg-success/10">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  <AlertDescription className="text-success-foreground">
                    No admin account exists. Register to become the administrator.
                  </AlertDescription>
                </Alert>
              )}

              <Tabs 
                value={activeTab} 
                onValueChange={(v) => {
                  // Prevent switching to register if admin exists
                  if (v === "register" && adminExists) {
                    return;
                  }
                  setActiveTab(v as "login" | "register");
                }}
              >
                {/* Conditionally render tabs - only show Register when no admin exists */}
                <TabsList className={`grid w-full mb-6 ${adminExists ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  <TabsTrigger value="login">Login</TabsTrigger>
                  {adminExists === false && (
                    <TabsTrigger value="register">Register</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        name="email"
                        type="email"
                        placeholder="admin@school.edu"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={fieldErrors.email ? "border-destructive" : ""}
                      />
                      {fieldErrors.email && (
                        <p className="text-sm text-destructive">{fieldErrors.email}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={handleInputChange}
                          className={fieldErrors.password ? "border-destructive pr-10" : "pr-10"}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      {fieldErrors.password && (
                        <p className="text-sm text-destructive">{fieldErrors.password}</p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                {/* Only render Register content when no admin exists */}
                {adminExists === false && (
                  <TabsContent value="register">
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-email">Email</Label>
                        <Input
                          id="register-email"
                          name="email"
                          type="email"
                          placeholder="admin@school.edu"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={fieldErrors.email ? "border-destructive" : ""}
                        />
                        {fieldErrors.email && (
                          <p className="text-sm text-destructive">{fieldErrors.email}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-password">Password</Label>
                        <div className="relative">
                          <Input
                            id="register-password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleInputChange}
                            className={fieldErrors.password ? "border-destructive pr-10" : "pr-10"}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                        {fieldErrors.password && (
                          <p className="text-sm text-destructive">{fieldErrors.password}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <div className="relative">
                          <Input
                            id="confirm-password"
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            className={fieldErrors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                        {fieldErrors.confirmPassword && (
                          <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
                        )}
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          "Create Admin Account"
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="glass-effect border-t border-primary/20 py-4 text-center relative z-10">
        <p className="text-sm text-foreground">© {new Date().getFullYear()} Ramjibanpur Babulal Institution. All Rights Reserved.</p>
        <p className="text-xs text-muted-foreground mt-1">Excellence in Education Since 1925</p>
        <p className="text-xs text-primary mt-1 font-bold text-glow">Made With ❤️ By Subhajit Das Whose ID is 04070122000103</p>
      </footer>
    </div>
  );
};

export default AdminAuth;
