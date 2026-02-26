import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { LogOutIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Frame from '../assets/images/Frame.png';
import Admin from '../assets/images/Dashboard/Admin.png';

interface RecentActivity {
  id: string;
  message: string;
  timestamp: string;
  type: 'api' | 'document' | 'code' | 'roi';
}

export default function ActivitiesPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch recent activities
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        
        const activitiesResponse = await fetch('/api/dashboard/activities', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (activitiesResponse.ok) {
          const activitiesData = await activitiesResponse.json();
          setRecentActivities(activitiesData);
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
        setRecentActivities([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchActivities();
    }
  }, [user]);

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;
    return activityTime.toLocaleDateString();
  };

  return (
    <div className="flex h-screen bg-[#010409] w-full">
      <AppSidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-[#21262d] flex items-center justify-between px-6 py-[11px] bg-[#010409]">
          <div className="flex items-center gap-2">
            <img src={Frame} className="w-5 h-5" />
            <h1 className="text-gray-300 text-l">
              Activities
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
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Recent Activities</h2>
              <div className="bg-transparent p-6">
                {isLoading ? (
                  <p className="text-[#c9d1d9] text-center">Loading activities...</p>
                ) : recentActivities.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-4 bg-[#0d1117] rounded-md">
                        <div className="flex flex-col">
                          <p className="text-[#f0f6fc] text-sm">{activity.message}</p>
                          <p className="text-[#99a2ff] text-xs font-bold mt-1">
                            {formatTimestamp(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#c9d1d9] text-center">No recent activities to display.</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
