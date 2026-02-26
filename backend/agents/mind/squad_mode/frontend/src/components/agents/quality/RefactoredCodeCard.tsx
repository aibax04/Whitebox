
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CodeDisplay from "@/components/CodeDisplay";
import { Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface RefactoredCodeCardProps {
  refactoredCode: string;
  language: string;
  fileName: string | null;
}

/**
 * Component displaying the refactored code with download option
 */
const RefactoredCodeCard = ({ refactoredCode, language, fileName }: RefactoredCodeCardProps) => {
  const handleDownload = () => {
    if (!fileName) return;
    
    const blob = new Blob([refactoredCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    
    // Add 'refactored' to the filename before the extension
    const fileNameParts = fileName.split(".");
    const extension = fileNameParts.pop();
    const newFileName = fileNameParts.join(".") + "-refactored." + extension;
    
    a.download = newFileName;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Refactored Code Downloaded",
      description: `Saved as ${newFileName}`,
      duration: 3000,
    });
  };

  return (
    <Card className="border border-squadrun-primary/20 bg-squadrun-darker/50">
      <CardHeader className="pb-2 flex flex-row justify-between items-center">
        <CardTitle className="text-lg">Refactored Code</CardTitle>
        <Button
          onClick={handleDownload}
          className="bg-squadrun-primary hover:bg-squadrun-vivid text-white"
          size="sm"
        >
          <Download className="h-4 w-4 mr-2" /> Download
        </Button>
      </CardHeader>
      <CardContent className="max-h-[300px] overflow-auto">
        <CodeDisplay code={refactoredCode} language={language} />
      </CardContent>
    </Card>
  );
};

export default RefactoredCodeCard;
