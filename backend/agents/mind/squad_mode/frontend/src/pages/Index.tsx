
import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/Sidebar";
import UnifiedAgent from "@/components/agents/UnifiedAgent";
import DocumentCreator from "@/components/agents/DocumentCreator";
import ApiCreator from "@/components/agents/ApiCreator";

const Index = () => {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeTab, setActiveTab] = useState("inspector");

  const handleTabChange = (tab: string) => {
    // Only transition if we're changing tabs
    if (tab !== activeTab) {
      setIsTransitioning(true);
      // Wait for transition animation before changing tab
      setTimeout(() => {
        setActiveTab(tab);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result as string;
      setFileContent(content);
    };
    reader.readAsText(file);
  };

  const renderActiveComponent = () => {
    switch (activeTab) {
      case "inspector":
        return <UnifiedAgent fileContent={fileContent} fileName={fileName} />;
      case "documents":
        return <DocumentCreator fileContent={fileContent} fileName={fileName} />;
      case "api":
        return <ApiCreator />;
      default:
        return <UnifiedAgent fileContent={fileContent} fileName={fileName} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-squadrun-dark overflow-hidden w-full">
        <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-squadrun-primary/20">
            <SidebarTrigger className="text-squadrun-gray hover:text-white" />
          </div>
          <div className={`flex-1 overflow-auto transition-opacity duration-300 ease-in-out ${isTransitioning ? "opacity-0" : "opacity-100"}`}>
            {renderActiveComponent()}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
