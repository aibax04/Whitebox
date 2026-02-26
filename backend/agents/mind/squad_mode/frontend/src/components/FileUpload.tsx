
import { useState, useRef, DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface FileUploadProps {
  onFileUpload: (file: File) => void;
}

export default function FileUpload({
  onFileUpload
}: FileUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFileName(files[0].name);
      onFileUpload(files[0]);
    }
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setFileName(files[0].name);
      onFileUpload(files[0]);
    }
  };

  // Now accepting all file types
  const getAcceptedFileTypes = () => {
    return "*";
  };

    return (
    <div className="w-full">
      <div className={`border-2 border-dashed border-squadrun-primary/30 rounded-xl p-8 transition-all duration-300 
          ${isDragging ? 'border-squadrun-primary bg-squadrun-primary/10 scale-105' : 'hover:border-squadrun-primary/50'}`} 
        onDragOver={handleDragOver} 
        onDragLeave={handleDragLeave} 
        onDrop={handleDrop}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={getAcceptedFileTypes()} />
        <div className="flex flex-col items-center w-full gap-6">
          <div className="rounded-full bg-squadrun-primary/20 p-6 transition-all duration-300 hover:bg-squadrun-primary/30">
            <Upload className="h-10 w-10 text-squadrun-primary" />
          </div>

          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Upload Your File</h3>
            <p className="text-squadrun-gray text-sm mb-4">
              Drag and drop your file here, or click the button below
            </p>
            <Button 
              onClick={handleBrowseClick} 
              className="bg-squadrun-primary hover:bg-squadrun-vivid transition-all duration-300 shadow-md hover:shadow-lg text-white px-6 py-2"
            >
              Choose File
            </Button>
          </div>
        </div>

        {fileName && (
          <div className="mt-6 p-4 bg-squadrun-primary/10 rounded-lg text-white text-center border border-squadrun-primary/20">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-squadrun-primary font-medium">File Selected:</span>
              <span className="text-white">{fileName}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
