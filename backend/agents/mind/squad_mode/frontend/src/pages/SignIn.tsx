import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import OutlookSignIn from '@/components/OutlookSignIn';
import { FaGithub } from 'react-icons/fa';
import Signin_Frame from '../assets/images/Signin_Frame.png';
import GoogleSignIn from '@/components/GoogleSignIn';
import { Button } from '@/components/ui/button';

export default function SignIn() {
  const { login, user, isAuthenticated, isLoading, setUser } = useAuth();
  const navigate = useNavigate();
  const checkedOutlook = useRef(false);

  useEffect(() => {
    // Wait for auth state to be restored before checking
    if (isLoading) {
      return;
    }

    // If user is already authenticated, redirect to dashboard
    if (isAuthenticated) {
      navigate('/dashboard');
      return;
    }

    // Check for JWT token in URL (after Outlook login)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      // Remove token from URL for cleanliness
      window.history.replaceState({}, document.title, window.location.pathname);
      (async () => {
        try {
          await login(token);
          toast.success('Successfully signed in!');
          navigate('/dashboard');
        } catch (error) {
          toast.error('Sign in failed', { description: 'Invalid or expired token.' });
        }
      })();
      return;
    }


    // Only check once for Outlook session (legacy cookie-based fallback)
    if (!checkedOutlook.current) {
      checkedOutlook.current = true;
      fetch('/api/me', {
        credentials: 'include',
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.user) {
            setUser({
              id: data.user.oid || data.user.sub || data.user.id || '',
              email: data.user.email || data.user.preferred_username || '',
              name: data.user.name || data.user.given_name || '',
              picture: data.user.picture || '',
              role: data.user.role
            });
            navigate('/dashboard');
          }
        })
        .catch(() => { });
    }
  }, [isAuthenticated, isLoading, navigate, setUser, login]);

  const handleSuccess = async (credentialResponse: any) => {
    try {
      // Send Google credential to backend to get app JWT with role
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      if (!res.ok) throw new Error('Backend login failed');
      const data = await res.json();
      // Use the returned JWT for login (contains role)
      await login(data.token);
      toast.success('Successfully signed in!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Sign in failed', {
        description: error.message || 'You are not authorized to access this application.'
      });
    }
  };

  const handleError = () => {
    console.error('Google Sign-In error: Origin not allowed');
    toast.error('Sign in failed', {
      description: 'There was an error signing in with Google. Please check if your domain is authorized.'
    });
  };

  return (
    <div className="w-full h-full max-h-screen  grid grid-cols-2 bg-black/60">
      <div className='w-full h-full flex items-center justify-center'>
        <Card className="w-2/3 h-1/2 bg-squadrun-darker/70 border-none rounded-3xl transition-all duration-300">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl mt-14 font-bold tracking-wider">
              <span className="text-squadrun-primary">Squad</span>
              <span className="text-white">Mode</span>
              <span className="text-squadrun-primary ml-1">AI</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center mt-10">
            <p className="text-md text-white/80 text-center font-bold tracking-wide">
              Sign In to SquadMode AI
            </p>
            <p className="text-sm text-squadrun-gray text-center">
              Welcome back! Please sign in to continue
            </p>
            <div className="w-2/3 flex flex-col items-center mt-20 gap-4">
              <GoogleSignIn
              />
              <OutlookSignIn />
              <Button
                onClick={() => {
                  window.location.href = '/api/auth/github/login';
                }}
                variant="outline"
                className="w-full items-center justify-center rounded-md border border-squadrun-gray px-4 py-2 text-sm font-medium text-white hover:bg-squadrun-gray/20 transition-colors"
              >
                <FaGithub className="w-4 h-4" />
                Sign in with GitHub
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-full h-full bg-white">
        <img src={Signin_Frame} alt="Signin Frame" className="w-full h-full max-h-screen" />
      </div>
    </div>
  );
}