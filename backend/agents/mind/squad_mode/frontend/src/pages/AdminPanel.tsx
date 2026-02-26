import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BackButton from '@/components/BackButton';

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="h-screen bg-squadrun-darker p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <BackButton onClick={() => navigate('/dashboard')} />
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
              <Shield className="w-7 h-7 text-squadrun-primary" /> Admin Panel
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-squadrun-primary/10 px-3 py-1 rounded-full">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border-2 border-squadrun-primary"
                />
              ) : (
                <UserIcon className="w-8 h-8 text-squadrun-primary" />
              )}
              <span className="text-sm text-white font-semibold">{user.name}</span>
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${user.role === 'superadmin' ? 'bg-gradient-to-r from-yellow-400 to-pink-500 text-black' : user.role === 'admin' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}>{user.role}</span>
            </div>
            <Button
              variant="ghost"
              onClick={logout}
              className="text-sm text-squadrun-gray hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-6 items-center mt-16">
          {/* <Button
            className="w-64 h-16 text-xl font-bold bg-squadrun-primary text-white shadow-lg hover:bg-squadrun-primary/80"
            onClick={() => navigate('/admin/documents')}
          >
            Document Approval
          </Button> */}
          <Button
            className="w-64 h-16 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:bg-blue-800"
            onClick={() => navigate('/admin/roles')}
          >
            Role Management
          </Button>
        </div>
      </div>
    </div>
  );
}