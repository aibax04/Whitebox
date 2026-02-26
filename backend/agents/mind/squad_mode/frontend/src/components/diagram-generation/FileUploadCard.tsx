import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText } from 'lucide-react';

interface FileUploadCardProps {
  uploadedFile: File | null;
  onFileUpload: (file: File) => void;
}

export const FileUploadCard: React.FC<FileUploadCardProps> = ({ uploadedFile, onFileUpload }) => {
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  });

  return (
    <Card className="mb-6 bg-transparent border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Upload PRD Document</CardTitle>
        <CardDescription className="text-gray-400">
          Upload a PDF or TXT file containing your Product Requirements Document
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          {uploadedFile ? (
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-5 h-5 text-green-500" />
              <p className="text-green-500 font-medium">{uploadedFile.name}</p>
            </div>
          ) : (
            <>
              <p className="text-gray-300 mb-2">
                {isDragActive ? 'Drop the file here' : 'Drag & drop a file here, or click to browse'}
              </p>
              <p className="text-sm text-gray-500">Supported formats: PDF, TXT</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

