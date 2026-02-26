import React, { useState } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaCloudUploadAlt, FaSpinner } from 'react-icons/fa';


interface S3SaveButtonProps {
  documentContent: Blob | (() => Blob);
  documentName: string;
  mimeType?: string;
}

const S3SaveButton: React.FC<S3SaveButtonProps> = ({ documentContent, documentName, mimeType = 'application/pdf' }) => {
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setUploading(true);
    setError(null);
    setSuccess(false);
    try {
      // Generate PDF blob on-demand to ensure it uses the latest content with exact same formatting
      const pdfBlob = typeof documentContent === 'function' ? documentContent() : documentContent;
      
      // Convert blob to base64 for backend upload (avoids CORS issues)
      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1]; // Remove data:application/pdf;base64, prefix
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      // Upload through backend to avoid CORS issues
      const token = localStorage.getItem('token');
      const uploadRes = await fetch('/api/upload-to-s3', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          filename: documentName,
          filetype: mimeType,
          fileContent: base64Content,
        }),
      });
      
      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Upload failed');
      }
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="inline-block">
      <button
        onClick={handleSave}
        disabled={uploading}
        className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition-colors duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
          ${uploading ? 'bg-blue-300 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}
        `}
      >
        {uploading ? (
          <FaSpinner className="animate-spin" />
        ) : (
          <FaCloudUploadAlt />
        )}
        {uploading ? 'Saving...' : 'Save'}
      </button>
      {success && (
        <span className="ml-3 inline-flex items-center text-green-600 font-medium animate-fade-in">
          <FaCheckCircle className="mr-1" /> Saved!
        </span>
      )}
      {error && (
        <span className="ml-3 inline-flex items-center text-red-600 font-medium animate-fade-in">
          <FaExclamationCircle className="mr-1" /> {error}
        </span>
      )}
    </div>
  );
};

export default S3SaveButton;
