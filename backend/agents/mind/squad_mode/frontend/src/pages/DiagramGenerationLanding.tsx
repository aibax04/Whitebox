import { useNavigate } from 'react-router-dom';
import AppSidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, FileText, GitBranch } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Frame_4 from '@/assets/images/Frame_4.png';
import Admin from '@/assets/images/Dashboard/Admin.png';

const DiagramGenerationLanding = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-[#010409] w-full">
      <AppSidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-[#21262d] flex items-center justify-between px-6 py-[11px] bg-[#010409]">
          <div className="flex items-center gap-2">
            <img src={Frame_4} className="w-5 h-5" alt="Diagram" />
            <h1 className="text-gray-300 text-l">Diagram Generation</h1>
          </div>
          
          {/* Right Side */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className="h-[34px] px-[13px] py-[7px] bg-[#0d1117] border-[#21262d] text-[#c9d1d9] hover:bg-[#161b22] rounded-[22px]"
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
            
            {/* Admin Panel */}
            {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'user') && (
              <Button
                variant="outline"
                className="h-[34px] px-[13px] py-[7px] bg-[#0d1117] border-[#21262d] text-[#c9d1d9] hover:bg-[#161b22] rounded-[22px]"
                onClick={() => navigate('/admin')}
              >
                <img src={Admin} className="w-4 h-4" alt="Admin" />
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

        <main className="flex-1 overflow-auto bg-[#010409] p-8">
          <div className="max-w-4xl mx-auto">
            {/* Title Section */}
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Generate System Diagrams
              </h2>
              <p className="text-gray-400 text-lg">
                Create High-Level Design (HLD), Low-Level Design (LLD), and Entity Relationship Diagrams (ERD)
              </p>
            </div>

            {/* Options Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Upload PRD Option */}
              <Card 
                className="bg-[#1a1f2e] border-gray-700 hover:border-purple-500 transition-all cursor-pointer group"
                onClick={() => navigate('/diagram-generation/prd')}
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-purple-600/20 flex items-center justify-center group-hover:bg-purple-600/30 transition-all">
                    <FileText className="w-10 h-10 text-purple-500" />
                  </div>
                  <CardTitle className="text-white text-xl">Upload PRD Document</CardTitle>
                  <CardDescription className="text-gray-400 mt-2">
                    Generate diagrams from your Product Requirements Document
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button 
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/diagram-generation/prd');
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Upload PRD
                  </Button>
                  <ul className="mt-4 text-sm text-gray-400 text-left space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 mt-0.5">•</span>
                      <span>Upload PDF or TXT files</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 mt-0.5">•</span>
                      <span>AI analyzes document content</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 mt-0.5">•</span>
                      <span>Quick and straightforward</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Load Repository Option */}
              <Card 
                className="bg-[#1a1f2e] border-gray-700 hover:border-purple-500 transition-all cursor-pointer group"
                onClick={() => navigate('/diagram-generation/repository')}
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-purple-600/20 flex items-center justify-center group-hover:bg-purple-600/30 transition-all">
                    <GitBranch className="w-10 h-10 text-purple-500" />
                  </div>
                  <CardTitle className="text-white text-xl">Load Repository</CardTitle>
                  <CardDescription className="text-gray-400 mt-2">
                    Generate diagrams from your repository's code context
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button 
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/diagram-generation/repository');
                    }}
                  >
                    <GitBranch className="w-4 h-4 mr-2" />
                    Load Repository
                  </Button>
                  <ul className="mt-4 text-sm text-gray-400 text-left space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 mt-0.5">•</span>
                      <span>Connect GitHub repositories</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 mt-0.5">•</span>
                      <span>AI analyzes actual codebase</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 mt-0.5">•</span>
                      <span>More accurate & detailed</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Info Section */}
            <Card className="mt-8 bg-[#1a1f2e]/50 border-gray-700">
              <CardContent className="p-6">
                <h3 className="text-white font-semibold mb-3">Supported Diagram Types</h3>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-purple-400 font-medium">High-Level Design (HLD)</p>
                    <p className="text-gray-400">System architecture and major components</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-purple-400 font-medium">Low-Level Design (LLD)</p>
                    <p className="text-gray-400">Detailed interactions and class structures</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-purple-400 font-medium">Entity Relationship (ERD)</p>
                    <p className="text-gray-400">Database schema and relationships</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DiagramGenerationLanding;

