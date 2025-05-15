
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail, KeyRound, LogIn, TriangleAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const loginFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password cannot be empty.' }), // Kept for UI, not used by mock auth
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  // const [isLoading, setIsLoading] = useState(false); // isLoading now comes from authContext
  const [formError, setFormError] = useState<string | null>(null); // Kept for potential local form errors
  const { loginWithEmailPassword, loading: authLoading } = useAuth();
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    // setIsLoading(true); // Handled by authLoading
    setFormError(null);
    try {
      await loginWithEmailPassword(data.email, data.password);
      // router.push('/'); // Redirect handled by AuthContext in this mock version
    } catch (error) {
      // For a real API, you might setFormError here based on error.message
      // For mock, AuthContext handles success/toast. Errors are less likely with mock.
      console.error("Mock login error (should be rare):", error);
      setFormError("An unexpected error occurred during mock login.");
      // setIsLoading(false); // Handled by authLoading
    }
    // setIsLoading(false); // Handled by authLoading
  };

  // const currentLoadingState = isLoading || authLoading; // Simplified to just authLoading

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-foreground">Welcome Back!</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to access your HealthAssist AI insights. (Prototype Login)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {formError && (
            <div className="bg-destructive/10 p-3 rounded-md flex items-center text-sm text-destructive">
              <TriangleAlert className="h-5 w-5 mr-2" />
              {formError}
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input type="email" placeholder="you@example.com" {...field} className="pl-10" disabled={authLoading} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input type="password" placeholder="••••••••" {...field} className="pl-10" disabled={authLoading} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={authLoading}>
                {authLoading ? <LoadingSpinner size={20} className="mr-2" /> : <LogIn className="mr-2 h-5 w-5" />}
                Sign In
              </Button>
            </form>
          </Form>
          
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
