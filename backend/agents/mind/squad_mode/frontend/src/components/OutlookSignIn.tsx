import React from 'react';
import { Button } from '@/components/ui/button';
import { FaMicrosoft } from 'react-icons/fa';

const OUTLOOK_AUTH_URL= import.meta.env.VITE_OUTLOOK_AUTH_URL || 'http://localhost:3000/api/auth/outlook';

const OutlookSignIn: React.FC = () => {
  const handleSignIn = () => {
    window.location.href = OUTLOOK_AUTH_URL;
  };

  return (
    <Button
      onClick={handleSignIn}
      variant="outline"
      className="w-full items-center justify-center rounded-md border border-squadrun-gray px-4 py-2 text-sm font-medium text-white hover:bg-squadrun-gray/20 transition-colors"
    >
      <FaMicrosoft className="w-4 h-4" /> 
      Sign in with Microsoft
    </Button>
  );
};

export default OutlookSignIn;
