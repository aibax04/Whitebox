import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Google from '../assets/images/Google.png';

export default function GoogleSignIn() {
  const { login, user, logout } = useAuth();

  const handleSuccess = async (tokenResponse: any) => {
    try {
      // console.log('Google OAuth response:', tokenResponse);
      
      // For implicit flow, we get an access token, not a credential
      // We need to get user info from Google using the access token
      const userInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenResponse.access_token}`);
      if (!userInfoResponse.ok) {
        throw new Error('Failed to get user info from Google');
      }
      
      const userInfo = await userInfoResponse.json();
      // console.log('User info from Google:', userInfo);
      
      // Send user info to backend to get app JWT with role
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture
        })
      });
      if (!res.ok) throw new Error('Backend login failed');
      const data = await res.json();
      // Use the returned JWT for login (contains role)
      await login(data.token);
      toast.success('Successfully signed in!');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Sign in failed', {
        description: error.message || 'You are not authorized to access this application.'
      });
    }
  };

  const handleError = () => {
    toast.error('Sign in failed', {
      description: 'There was an error signing in with Google.'
    });
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleSuccess,
    onError: handleError,
    flow: 'implicit',
    // Use implicit flow to avoid COOP issues
    scope: 'openid email profile'
  });

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <img
          src={user.picture}
          alt={user.name}
          className="w-8 h-8 rounded-full"
        />
        <span className="text-sm">{user.name}</span>
        <Button
          variant="ghost"
          onClick={logout}
          className="text-sm"
        >
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => googleLogin()}
      variant="outline"
      className="w-full items-center justify-center rounded-md border border-squadrun-gray px-4 py-2 text-sm font-medium text-white hover:bg-squadrun-gray/20 transition-colors"
    >
      <img src={Google} alt="Google" className="w-5 h-5" />
      
      <span className="text-white font-medium">Sign in with Google</span>
    </Button>
  );
} 