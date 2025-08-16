import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { useInputValidation } from '@/hooks/useInputValidation';
import { useRateLimit } from '@/hooks/useRateLimit';

export const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { validateEmail, validatePassword, validateText } = useInputValidation();
  const { checkRateLimit, isBlocked } = useRateLimit();

  // Input sanitization helper
  const sanitizeInput = (input: string): string => {
    return input.replace(/[<>&"']/g, (char) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return entities[char];
    });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Clean up existing auth state before signing in to prevent limbo states
      const { cleanupAuthState, clearCachedUserState } = await import('@/utils/authCleanup');
      cleanupAuthState();
      clearCachedUserState();
      
      // Attempt global sign out to ensure clean state
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }
      // Check rate limiting for auth attempts
      const operation = isSignUp ? 'signup' : 'signin';
      const rateLimitAllowed = await checkRateLimit(operation, {
        maxAttempts: 5,
        windowMinutes: 15
      });

      if (!rateLimitAllowed) {
        throw new Error('Too many attempts. Please wait 15 minutes before trying again.');
      }

      // Validate inputs
      const emailValidation = validateEmail(email);
      const passwordValidation = validatePassword(password);
      
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.errors[0]);
      }
      
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors[0]);
      }

      let fullNameValidation;
      if (isSignUp) {
        fullNameValidation = validateText(fullName, {
          required: true,
          minLength: 2,
          maxLength: 100,
          allowSpecialChars: false,
          fieldName: 'Full name'
        });
        
        if (!fullNameValidation.isValid) {
          throw new Error(fullNameValidation.errors[0]);
        }
      }

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: emailValidation.sanitizedValue,
          password: passwordValidation.sanitizedValue,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullNameValidation!.sanitizedValue,
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          logger.log('User signed up successfully', { userId: data.user.id });

          toast({
            title: "Account created!",
            description: "You can now sign in with your credentials.",
          });
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailValidation.sanitizedValue,
          password: passwordValidation.sanitizedValue,
        });

        if (error) throw error;

        logger.log('User signed in', { email: emailValidation.sanitizedValue });

        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully.",
        });
        
        // Force page reload to ensure clean authentication state
        window.location.href = '/';
      }
    } catch (error: any) {
      logger.error('Authentication error', error);
      
      // Provide user-friendly error messages
      let errorMessage = error.message;
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials.';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and confirm your account before signing in.';
      } else if (error.message.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      }

      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? 'Create Account' : 'Sign In'}</CardTitle>
          <CardDescription>
            {isSignUp
              ? 'Create a new account to get started'
              : 'Sign in to your account'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="fullName" className="text-sm font-medium">
                  Full Name
                </label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  maxLength={100}
                  pattern="[a-zA-Z\s]+"
                  title="Full name should only contain letters and spaces"
                />
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={254}
                pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                title="Please enter a valid email address"
                data-testid="email-input"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                title="Password must be at least 8 characters long"
                data-testid="password-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || isBlocked}
              data-testid={isSignUp ? "signup-button" : "login-button"}
            >
              {loading ? 'Loading...' : isBlocked ? 'Too many attempts - Please wait' : (isSignUp ? 'Create Account' : 'Sign In')}
            </Button>

            {isBlocked && (
              <p className="text-sm text-destructive text-center mt-2">
                Too many failed attempts. Please wait 15 minutes before trying again.
              </p>
            )}

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-primary hover:underline"
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"
                }
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};