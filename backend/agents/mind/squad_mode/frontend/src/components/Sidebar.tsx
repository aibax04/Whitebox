
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Bot } from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaGithub } from 'react-icons/fa';
import squadrun_Icon from '../assets/images/squadrun_Icon.png';
import container from '../assets/images/Container.png';
import tabler_icon_layout_sidebar_left_collapse_filled from '../assets/images/tabler-icon-layout-sidebar-left-collapse-filled.png';
import Icon_Wrapper from '../assets/images/Icon_Wrapper.png';
import Frame from '../assets/images/Frame.png';
import Frame_1 from '../assets/images/Frame_1.png';
import Frame_2 from '../assets/images/Frame_2.png';
import Frame_3 from '../assets/images/Frame_3.png';
import Frame_4 from '../assets/images/Frame_4.png';
import Frame_5 from '../assets/images/Frame_5.png';
import Frame_6 from '../assets/images/Frame_6.png';
import Frame_7 from '../assets/images/Frame_7.png';

interface NavItem {
  icon: React.ElementType;
  label: string;
  value: string;
  path: string;
}

export default function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const analyzeItems: NavItem[] = [
    {
      icon: () => <img src={Frame_5} alt="Frame 5" style={{ width: 24, height: 24 }} />,
      label: "Code Inspector",
      value: "inspector",
      path: "/code-inspector"
    },
    {
      icon: () => <img src={Frame_1} alt="Frame 1" style={{ width: 24, height: 24 }} />,
      label: "Documentation",
      value: "documentation",
      path: "/documentation"
    },
    {
      icon: Bot,
      label: "SquadBot",
      value: "squadbot",
      path: "/squadbot"
    }
  ];

  const planItems: NavItem[] = [
    {
      icon: () => <img src={Frame_2} alt="Frame 2" style={{ width: 24, height: 24 }} />,
      label: "Requirement Assistant",
      value: "prd-chatbot",
      path: "/requirement-assistant"
    },
    {
      icon: () => <img src={Frame_7} alt="Frame 7" style={{ width: 24, height: 24 }} />,
      label: "ROI Calculator",
      value: "roi-calculator",
      path: "/roi-calculator"
    },
    {
      icon: () => <img src={Frame_3} alt="Frame 3" style={{ width: 24, height: 24 }} />,
      label: "Strategic Planner",
      value: "planner",
      path: "/strategic-planner"
    },
    {
      icon: () => <img src={Frame_6} alt="Frame 6" style={{ width: 24, height: 24 }} />,
      label: "Diagram Generation",
      value: "diagram-generation",
      path: "/diagram-generation"
    },
  ];

  const shareItems: NavItem[] = [
    {
      icon: () => <img src={Frame_4} alt="Frame 4" style={{ width: 24, height: 24 }} />,
      label: "Document Approval",
      value: "approval",
      path: "/document-approval"
    },
    // {
    //   icon: FaGithub,
    //   label: "GitHub Repos",
    //   value: "github-repos",
    //   path: "/github-repos"
    // }
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className={cn(
      "relative h-full bg-[#0f1318] border-r border-[#21262d] transition-all duration-300 ease-in-out",
      isCollapsed ? "w-[72px]" : "w-[336px]"
    )}>
      {/* Header */}
      {!isCollapsed && (
        <div className={cn(
          "flex items-center gap-2 px-6 py-6 transition-all duration-300",
          isCollapsed ? "px-2 justify-center" : "px-6"
        )}>

          <div className="flex items-center gap-2">
            <div>
              <img src={squadrun_Icon} className="w-7 h-7" />
            </div>
            <div className="text-white text-xl font-semibold">
              SquadMode AI
            </div>
          </div>
        </div>
      )}
      {isCollapsed &&
        <div className="ml-2 mt-4">
          <img src={squadrun_Icon} alt="squadrun_Icon" className="size-8 ml-3" />
        </div>}
      {/* Collapse Sidebar Button */}
      <div className={cn(
        "mt-6 mb-6 transition-all duration-300",
        isCollapsed ? "mx-2" : "mx-6"
      )}>
        <Button
          variant="outline"
          className={cn(
            "w-full h-15 ml-2 mr-2 bg-transparent border border-none",
            isCollapsed 
              ? "p-0 w-9 h-9 hover:bg-transparent hover:scale-110 transition-all duration-300 ease-in-out" 
              : "w-full transition-all duration-300 ease-in-out"
          )}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <img src={container} className="w-9 h-8 ml-1 border-1 rounded-md" />
          ) : (
            <>
              <img src={tabler_icon_layout_sidebar_left_collapse_filled} className="w-6 h-5" />
              COLLAPSE SIDEBAR
            </>
          )}
        </Button>
      </div>

      {/* Dashboard Section */}
      <div className={cn(
        "mb-6 transition-all duration-300",
        isCollapsed ? "px-2" : "px-6"
      )}>
        <div
          onClick={() => handleNavigation("/dashboard")}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors",
            isCollapsed ? "justify-center px-2" : "px-4",
            isActive("/dashboard")
              ? "bg-white/20 rounded-lg"
              : "hover:bg-white/20 rounded-lg"
          )}
        >
          <img src={Icon_Wrapper} className="size-6" />
          {!isCollapsed && (
            <span className="text-sm font-medium">Dashboard</span>
          )}
        </div>
        <div
          onClick={() => handleNavigation("/activities")}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors mt-1",
            isCollapsed ? "justify-center px-2" : "px-4",
            isActive("/activities")
              ? "bg-white/20 rounded-lg"
              : "hover:bg-white/20 rounded-lg"
          )}
        >
          <img src={Frame} className="size-6" />
          {!isCollapsed && (
            <span className="text-sm font-medium">Activities</span>
          )}
        </div>
      </div>

      {/* Analyze Section */}
      <div className={cn(
        "mb-6 transition-all duration-300",
        isCollapsed ? "px-2" : "px-6"
      )}>
        {!isCollapsed && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[#b7c3d4] text-xs font-bold tracking-[0.4px]">ANALYZE</span>
          </div>
        )}

        <div className="space-y-1">
          {analyzeItems.map(item => (
            <div
              key={item.value}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2 rounded cursor-pointer transition-colors",
                isCollapsed ? "justify-center px-2" : "px-4",
                isActive(item.path)
                  ? "bg-white/20 rounded-lg"
                  : "hover:bg-white/20 rounded-lg"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && (
                <span className="text-sm">{item.label}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Plan Section */}
      <div className={cn(
        "mb-6 transition-all duration-300",
        isCollapsed ? "px-2" : "px-6"
      )}>
        {!isCollapsed && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[#b7c3d4] text-xs font-bold tracking-[0.4px]">PLAN</span>
          </div>
        )}

        <div className="space-y-1">
          {planItems.map(item => (
            <div
              key={item.value}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2 rounded cursor-pointer transition-colors",
                isCollapsed ? "justify-center px-2" : "px-4",
                isActive(item.path)
                  ? "bg-white/20 rounded-lg"
                  : "hover:bg-white/20 rounded-lg"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && (
                <span className="text-sm">{item.label}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Share Section */}
      <div className={cn(
        "mb-6 transition-all duration-300",
        isCollapsed ? "px-2" : "px-6"
      )}>
        {!isCollapsed && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[#b7c3d4] text-xs font-bold tracking-[0.4px]">SHARE</span>
          </div>
        )}

        <div className="space-y-1">
          {shareItems.map(item => (
            <div
              key={item.value}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2 rounded cursor-pointer transition-colors",
                isCollapsed ? "justify-center px-2" : "px-4",
                isActive(item.path)
                  ? "bg-white/20 rounded-lg"
                  : "hover:bg-white/20 rounded-lg"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && (
                <span className="text-sm">{item.label}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Active Tab Indicator */}
      {/* {activeTab !== "dashboard" && !isCollapsed && (
        <div className="absolute left-6 top-[161px] w-1 h-5 bg-[#794dc5] rounded-md" />
      )} */}
    </div>
  );
}
