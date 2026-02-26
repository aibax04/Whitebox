import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from '@/components/Sidebar';
import PRDChatbot from '@/components/agents/PRDChatbot';
import { Button } from '@/components/ui/button';
import { LogOutIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Frame_2 from '../assets/images/Frame_2.png';
import Admin from '../assets/images/Dashboard/Admin.png';

export default function PRDChatbotPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-[#010409] w-full">
      <AppSidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-[#21262d] flex items-center justify-between px-6 py-[11px] bg-[#010409]">
          <div className="flex items-center gap-2">
            <img src={Frame_2} className="w-5 h-5" />
            <h1 className="text-gray-300 text-l">
              Requirement Assistant
            </h1>
          </div>
          {/* Right Side */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className="h-[34px] px-[13px] py-[7px] bg-[#0d1117] border-[#21262d] text-[#c9d1d9] hover:bg-[#161b22] rounded-[22px]"
              onClick={logout}
            >
              <LogOutIcon className="w-4 h-4" />
              Sign Out
            </Button>
            {/* Admin Panel */}
            {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'user') && (
              <Button
                variant="outline"
                className="h-[34px] px-[13px] py-[7px] bg-[#0d1117] border-[#21262d] text-[#c9d1d9] hover:bg-[#161b22] rounded-[22px]"
                onClick={() => navigate('/admin')}
              >
                <img src={Admin} className="w-4 h-4" />
                Admin Panel
              </Button>
            )}
            {/* User Avatar */}
            <div className="w-[34px] h-[34px] rounded-full overflow-hidden">
              <img
                src={user?.picture}
                alt={user?.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto bg-[#010409]">
          <PRDChatbot />
        </main>
      </div>
    </div>
  );
}
