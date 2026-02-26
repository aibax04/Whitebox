import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from '@/components/Sidebar';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LogOutIcon } from 'lucide-react';
import { FaRoad } from 'react-icons/fa';
import DashboardChart from '@/components/DashboardChart';
import CodebaseHealth from '@/components/CodebaseHealth';
import { useNavigate } from 'react-router-dom';
import header_image from '../assets/images/header_image.png';
import Icon_Wrapper from '../assets/images/Icon_Wrapper.png';
import Frame_1 from '../assets/images/Frame_1.png';
import Frame_2 from '../assets/images/Frame_2.png';
import Frame_3 from '../assets/images/Frame_3.png';
import Frame_4 from '../assets/images/Frame_4.png';
import Frame_5 from '../assets/images/Frame_5.png';
import Frame_6 from '../assets/images/Frame_6.png';
import Frame_7 from '../assets/images/Frame_7.png';
import Icon from '../assets/images/Dashboard/Icon.png';
import Icon1 from '../assets/images/Dashboard/Icon1.png';
import Icon2 from '../assets/images/Dashboard/Icon2.png';
import Icon3 from '../assets/images/Dashboard/Icon3.png';
import IconContainer_1 from '../assets/images/Dashboard/IconContainer_1.png';
import IconContainer_2 from '../assets/images/Dashboard/IconContainer_2.png';
import IconContainer_3 from '../assets/images/Dashboard/IconContainer_3.png';
import Frame from '../assets/images/Frame.png';
import Admin from '../assets/images/Dashboard/Admin.png';

interface DashboardStats {
  docsGenerated: number;
  roadmapsCreated: number;
  filesShared: number;
  roisCalculated: number;
}

interface HistoricalData {
  date: string;
  docsGenerated: number;
  roadmapsCreated: number;
  filesShared: number;
  roisCalculated: number;
}

interface RecentActivity {
  id: string;
  message: string;
  timestamp: string;
  type: 'api' | 'document' | 'code' | 'roi';
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    docsGenerated: 0,
    roadmapsCreated: 0,
    filesShared: 0,
    roisCalculated: 0
  });
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch user statistics
        const statsResponse = await fetch('/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }

        // Fetch historical data
        const historicalResponse = await fetch('/api/dashboard/historical', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (historicalResponse.ok) {
          const historicalData = await historicalResponse.json();
          setHistoricalData(historicalData);
        }

        // Fetch recent activities
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
        console.error('Error fetching dashboard data:', error);
        // Set default values if API fails
        setStats({
          docsGenerated: 0,
          roadmapsCreated: 0,
          filesShared: 0,
          roisCalculated: 0
        });
        setHistoricalData([]);
        setRecentActivities([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
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
            <img src={Icon_Wrapper} className="w-5 h-5 text-white" />
            <h1 className="text-gray-300 text-l">
              Dashboard
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
          <div className="flex flex-col gap-8 p-4">
            {/* Header Section */}
            <div className="bg-transparent rounded-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-[#f0f6fc] text-2xl font-bold">
                      Hello, {user?.name?.split(' ')[0] || 'User'}
                    </h1>                    
                  </div>
                  <p className=" text-[#c9d1d9] text-md">
                    Welcome to SquadMode AI! Your all-in-one workspace for product, engineering, and collaboration. 
                  </p>
                </div>
                <div className="w-1/2 h-[136px]">
                  <img src={header_image} alt="dashboard-header" />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-3.5 w-[519px]">
              <h3 className="text-white text-xs tracking-wide">QUICK ACTIONS</h3>
              <div className="flex gap-3.5">
                <Button 
                  onClick={() => navigate('/requirement-assistant')}
                  className="h-11 px-5 bg-[#181d23] border border-[#344153] text-white hover:bg-[#21262d] rounded-full"
                >
                  <div className="w-6 h-6 bg-transparent flex items-center justify-center mr-2.5">
                    <img src={IconContainer_3} className="w-15 h-15" />
                  </div>
                  Generate a PRD
                </Button>
                <Button 
                  onClick={() => navigate('/code-inspector')}
                  className="h-11 px-5 bg-[#181d23] border border-[#344153] text-white hover:bg-[#21262d] rounded-full"
                >
                  <div className="w-6 h-6 bg-transparent flex items-center justify-center mr-2.5">
                    <img src={IconContainer_1} className="w-15 h-15" />
                  </div>
                  Inspect Code
                </Button>
                <Button 
                  onClick={() => navigate('/strategic-planner')}
                  className="h-11 px-5 bg-[#181d23] border border-[#344153] text-white hover:bg-[#21262d] rounded-full"
                >
                  <div className="w-6 h-6 bg-[#f65009] rounded-xl flex items-center justify-center mr-2.5">
                    <FaRoad className="w-3.5 h-3.5 text-white" />
                  </div>
                  Create a product roadmap
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#21262d] w-full" />

            {/* Main Content */}
            <div className="flex gap-6">
              {/* Left Column */}
              <div className="flex flex-col gap-6 w-2/3">
                {/* Stats Cards */}
                <div className="flex justify-between">
                  <div className="bg-[#0d1117] rounded-md p-3.5 w-1/5 h-20 flex items-center justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="text-white text-4xl font-bold">
                        {isLoading ? '...' : stats.docsGenerated}
                      </div>
                      <div className="text-[#c9d1d9] text-xs">Saved Docs</div>
                    </div>
                    <div className="w-14 h-14 bg-transparent flex items-center justify-center">
                      <img src={Icon} className="w-15 h-15" />
                    </div>
                  </div>
                  <div className="bg-[#0d1117] rounded-md p-3.5 w-1/5 h-20 flex items-center justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="text-white text-4xl font-bold">
                        {isLoading ? '...' : stats.roadmapsCreated}
                      </div>
                      <div className="text-[#c9d1d9] text-xs">Roadmaps Created</div>
                    </div>
                    <div className="w-14 h-14 bg-transparent flex items-center justify-center">
                      <img src={Icon1} className="w-15 h-15" />
                    </div>
                  </div>
                  <div className="bg-[#0d1117] rounded-md p-3.5 w-1/5 h-20 flex items-center justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="text-white text-4xl font-bold">
                        {isLoading ? '...' : stats.filesShared}
                      </div>
                      <div className="text-[#c9d1d9] text-xs">Files Shared</div>
                    </div>
                    <div className="w-14 h-14 bg-transparent flex items-center justify-center">
                      <img src={Icon2} className="w-15 h-15" />
                    </div>
                  </div>
                  <div className="bg-[#0d1117] rounded-md p-3.5 w-1/5 h-20 flex items-center justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="text-white text-4xl font-bold">
                        {isLoading ? '...' : stats.roisCalculated}
                      </div>
                      <div className="text-[#c9d1d9] text-xs">ROIs calculated</div>
                    </div>
                    <div className="w-14 h-14 bg-transparent flex items-center justify-center">
                      <img src={Icon3} className="w-15 h-15" />
                    </div>
                  </div>
                </div>

                {/* Chart Section */}
                <div className="bg-[#0d1117] rounded-md p-6 h-[513px]">
                  <div className="flex flex-col gap-6">
                    <h3 className="text-[#c9d1d9] text-xs font-medium tracking-wide">GROWTH CHART</h3>
                    <div className="h-px bg-[#21262d] w-full" />
                    <DashboardChart stats={stats} historicalData={historicalData} isLoading={isLoading} />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-6 w-1/3">
                {/* Recent Activity */}
                <div className="bg-[#0d1117] rounded-lg p-5 h-[300px]">
                  <div className="flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={Frame} className="w-5 h-5" />
                        <h3 className="text-[#c9d1d9] text-xs font-bold">RECENT ACTIVITY</h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/activities')}
                        className="text-[#79C0FF] bg-transparent hover:text-[#79C0FF]/80 hover:bg-transparent text-xs h-auto p-1"
                      >
                        View All Activities
                      </Button>
                    </div>
                    <div className="h-px bg-[#21262d] w-full" />
                    <div className="flex flex-col gap-1">
                      {isLoading ? (
                        <div className="text-[#8b949e] text-sm">Loading activities...</div>
                      ) : recentActivities.length > 0 ? (
                        recentActivities.slice(0, 3).map((activity) => (
                          <div key={activity.id} className="flex flex-col gap-1">
                            <p className="text-[#f0f6fc] text-sm leading-relaxed">
                              {activity.message}
                            </p>
                            <p className="text-[#99a2ff] text-xs font-bold">
                              {formatTimestamp(activity.timestamp)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="text-[#8b949e] text-sm">No recent activities</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Codebase Health */}
                <CodebaseHealth />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
