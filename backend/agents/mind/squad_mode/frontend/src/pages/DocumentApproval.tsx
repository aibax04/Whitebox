import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Share2, Trash2, Upload, GitBranch, CheckCircle, XCircle, LogOutIcon, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import ShareDocumentModal from '@/components/ShareDocumentModal';
import FileUpload from '@/components/FileUpload';
import DocumentJourneyModal from '@/components/DocumentJourneyModal';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from '@/components/Sidebar';
import { useNavigate } from 'react-router-dom';
import Frame_4 from '../assets/images/Frame_4.png';
import Admin from '../assets/images/Dashboard/Admin.png';

export default function DocumentApproval() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [remarkInput, setRemarkInput] = useState({});
  const [s3Files, setS3Files] = useState([]);
  const [s3Loading, setS3Loading] = useState(false);
  const [s3Error, setS3Error] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareFileId, setShareFileId] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [sharingHistoryModalOpen, setSharingHistoryModalOpen] = useState(false);
  const [sharingHistory, setSharingHistory] = useState<any[]>([]);
  const [sharingHistoryLoading, setSharingHistoryLoading] = useState(false);
  const [sharingHistoryError, setSharingHistoryError] = useState('');
  const [sharingHistoryFileName, setSharingHistoryFileName] = useState('');
  const [journeyModalOpen, setJourneyModalOpen] = useState(false);
  const [journeyFileId, setJourneyFileId] = useState<string | null>(null);
  const [journeyFileName, setJourneyFileName] = useState('');
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameFileId, setRenameFileId] = useState<string | null>(null);
  const [renameFileName, setRenameFileName] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  useEffect(() => {
    setFileLoading(true);
    axios.get('/api/files', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => setFiles(res.data))
      .catch(err => setFileError(err.response?.data?.message || 'Error fetching files'))
      .finally(() => setFileLoading(false));

    // Fetch files shared with the current user
    axios.get('/api/shared-with-me', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => setSharedFiles(res.data))
      .catch(() => setSharedFiles([]));

    setS3Loading(true);
    axios.get('/api/s3-files', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => setS3Files(res.data))
      .catch(err => setS3Error(err.response?.data?.message || 'Error fetching S3 files'))
      .finally(() => setS3Loading(false));
  }, []);

  const getFileUrl = async (key: string) => {
    const res = await axios.get(`/api/file-url/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return res.data.url;
  };

  const handleFileAction = async (fileId: string, action: 'approve' | 'reject') => {
    setActionLoading(fileId);
    try {
      const remark = remarkInput[fileId] || '';
      const res = await axios.post(`/api/file-action/${fileId}`, { action, remark }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setFiles(prev => prev.map(f => f._id === fileId ? res.data.file : f));
      setRemarkInput(prev => ({ ...prev, [fileId]: '' }));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating file');
    } finally {
      setActionLoading('');
    }
  };

  // Upload handler for FileUpload
  const handleFileUpload = async (file: File) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in to upload files.');
      return;
    }
    try {
      // Convert file to base64 for backend upload (avoids CORS issues)
      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1]; // Remove data URL prefix
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload through backend to avoid CORS issues
      const uploadRes = await axios.post('/api/upload-to-s3', {
        filename: file.name,
        filetype: file.type || 'application/octet-stream',
        fileContent: base64Content,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { metadata } = uploadRes.data;
      
      // Add the new file to the local state
      setFiles(prev => [...prev, metadata]);
      setUploadModalOpen(false);
      alert('File uploaded successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Upload failed');
    }
  };

  // Share document handler
  const handleShareDocument = async (fileId: string, email: string, remark: string) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('You must be logged in to share files.');
    const res = await axios.post(`/api/share-document/${fileId}`, { email, remark }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // Optionally refresh file list here
    return res.data;
  };

  // Rename file handler
  const handleRenameFile = async () => {
    if (!renameFileId || !newFileName.trim()) {
      alert('Please enter a valid file name');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in to rename files.');
      return;
    }

    setRenameLoading(true);
    try {
      const res = await axios.put(`/api/rename-file/${renameFileId}`, {
        newFileName: newFileName.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update the file in the local state
      setFiles(prev => prev.map(f => f._id === renameFileId ? res.data.file : f));
      setSharedFiles(prev => prev.map(f => f._id === renameFileId ? res.data.file : f));
      
      setRenameModalOpen(false);
      setNewFileName('');
      setRenameFileId(null);
      setRenameFileName('');
      alert('File renamed successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error renaming file');
    } finally {
      setRenameLoading(false);
    }
  };

  // Open rename modal
  const openRenameModal = (fileId: string, fileName: string) => {
    setRenameFileId(fileId);
    setRenameFileName(fileName);
    setNewFileName(fileName);
    setRenameModalOpen(true);
  };

  // Delete file handler
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`);
    if (!confirmed) return;

    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in to delete files.');
      return;
    }

    try {
      await axios.delete(`/api/delete-file/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove the file from the local state
      setFiles(prev => prev.filter(f => f._id !== fileId));
      setSharedFiles(prev => prev.filter(f => f._id !== fileId));
      
      alert('File deleted successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error deleting file');
    }
  };

  // Fetch sharing history for a file
  const handleViewSharingHistory = async (fileId: string, fileName: string) => {
    setSharingHistoryModalOpen(true);
    setSharingHistory([]);
    setSharingHistoryLoading(true);
    setSharingHistoryError('');
    setSharingHistoryFileName(fileName);
    try {
      const res = await axios.get(`/api/sharing-status/${fileId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSharingHistory(res.data);
    } catch (err: any) {
      setSharingHistoryError(err.response?.data?.message || 'Error fetching sharing history');
    } finally {
      setSharingHistoryLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#010409] w-full">
      <AppSidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-[#21262d] flex items-center justify-between px-6 py-[11px] bg-[#010409]">
          <div className="flex items-center gap-2">
            <img src={Frame_4} className="w-5 h-5" />
            <h1 className="text-gray-300 text-l">
              Document Approval
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
            <div className="max-w-6xl mx-auto">
        {/* S3 Files Section */}
        <Card className="bg-transparent border-none shadow-xl mb-8">
          <CardHeader>
            <div className="flex justify-between items-center border-b border-squadrun-primary/20 pb-2 mb-2">
              <CardTitle className="text-lg text-white font-bold tracking-wide">My Documents</CardTitle>
              <Button
                onClick={() => setUploadModalOpen(true)}
                className="bg-squadrun-darker/30 hover:bg-squadrun-primary/80 text-white px-4 py-2 rounded-full flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload File
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {fileLoading ? (
              <div className="text-squadrun-gray">Loading files...</div>
            ) : fileError ? (
              <div className="text-red-500">{fileError}</div>
            ) : (
              <>
                <table className="w-full text-white text-sm rounded-xl overflow-hidden mb-4">
                  <thead>
                    <tr className="bg-squadrun-primary/10">
                      <th className="text-center py-2 px-3">File Name</th>
                      <th className="text-center py-2 px-3">Status</th>
                      <th className="text-center py-2 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file: any) => (
                      <tr key={file._id} className="border-b border-squadrun-primary/10 hover:bg-squadrun-primary/5 transition">
                        <td className="py-2 px-3 font-semibold">{file.fileName}
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full px-2 py-1 text-xs font-semibold"
                              title="View Sharing History"
                              onClick={() => handleViewSharingHistory(file._id, file.fileName)}
                            >
                              View Sharing History
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="rounded-full px-2 py-1 text-xs font-semibold bg-primary/20 border-primary/30 text-primary hover:bg-primary/30"
                              title="View Document Journey"
                              onClick={() => {
                                setJourneyFileId(file._id);
                                setJourneyFileName(file.fileName);
                                setJourneyModalOpen(true);
                              }}
                            >
                              <GitBranch className="w-3 h-3 mr-1" />
                              Journey
                            </Button>
                          </div>
                        </td>
                        <td className="py-2 px-3">{file.currentStatus || 'N/A'}</td>
                                                 <td className="py-2 px-3">
                           <div className="flex gap-2 items-center">
                             <Button
                               size="sm"
                               variant="secondary"
                               className="rounded-full px-2 py-1 text-xs font-semibold"
                               title="Preview"
                               onClick={async () => {
                                 const url = await getFileUrl(file.s3Key);
                                 window.open(url, '_blank');
                               }}
                             >
                               <Eye className="w-4 h-4 mr-1" /> Preview
                             </Button>
                             <Button
                               size="sm"
                               variant="secondary"
                               className="rounded-full px-2 py-1 text-xs font-semibold"
                               title="Rename"
                               onClick={() => openRenameModal(file._id, file.fileName)}
                             >
                               <Pencil className="w-4 h-4 mr-1" /> Rename
                             </Button>
                             <Button
                               size="sm"
                               variant="secondary"
                               className="rounded-full px-2 py-1 text-xs font-semibold"
                               title="Share for Approval"
                               onClick={() => {
                                 setShareFileId(file._id);
                                 setShareModalOpen(true);
                               }}
                             >
                               <Share2 className="w-4 h-4 mr-1" /> Share
                             </Button>
                             <Button
                               size="sm"
                               variant="destructive"
                               className="rounded-full px-2 py-1 text-xs font-semibold"
                               title="Delete"
                               onClick={() => handleDeleteFile(file._id, file.fileName)}
                             >
                               <Trash2 className="w-4 h-4 mr-1"/>
                             </Button>
                           </div>
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Shared with me section */}
                {sharedFiles.length > 0 && (
                  <>
                    <div className="text-lg text-white font-bold mt-8 mb-2">Files Shared With Me</div>
                    <table className="w-full text-white text-sm rounded-xl overflow-hidden mb-4">
                      <thead>
                        <tr className="bg-squadrun-primary/10">
                          <th className="text-center py-2 px-3">File Name</th>
                          <th className="text-center py-2 px-3">Status</th>
                          <th className="text-center py-2 px-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sharedFiles.map((file: any) => (
                          <tr key={file._id} className="border-b border-squadrun-primary/10 hover:bg-squadrun-primary/5 transition">
                            <td className="py-2 px-3 font-semibold">
                              {file.fileName}
                              <div className="flex gap-2 mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-full px-2 py-1 text-xs font-semibold"
                                  title="View Sharing History"
                                  onClick={() => handleViewSharingHistory(file._id, file.fileName)}
                                >
                                  View Sharing History
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="rounded-full px-2 py-1 text-xs font-semibold bg-primary/20 border-primary/30 text-primary hover:bg-primary/30"
                                  title="View Document Journey"
                                  onClick={() => {
                                    setJourneyFileId(file._id);
                                    setJourneyFileName(file.fileName);
                                    setJourneyModalOpen(true);
                                  }}
                                >
                                  <GitBranch className="w-3 h-3 mr-1" />
                                  Journey
                                </Button>
                              </div>
                            </td>
                            <td className="py-2 px-3">{file.currentStatus || 'N/A'}</td>
                            <td className="py-2 px-3">
                              <div className="flex gap-2 items-center">
                                <Input
                                  className="w-32 text-white"
                                  placeholder="Remark"
                                  value={remarkInput[file._id] || ''}
                                  onChange={e => setRemarkInput((prev: any) => ({ ...prev, [file._id]: e.target.value }))}
                                />
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="rounded-full px-3 py-1 text-xs font-semibold"
                                  disabled={actionLoading === file._id}
                                  onClick={async () => {
                                    setActionLoading(file._id);
                                    try {
                                      const remark = remarkInput[file._id] || '';
                                      const token = localStorage.getItem('token');
                                      await axios.post(`/api/file-action/${file._id}`, { action: 'approve', remark }, {
                                        headers: { Authorization: `Bearer ${token}` }
                                      });
                                      setSharedFiles(prev => prev.filter(f => f._id !== file._id));
                                      setRemarkInput(prev => ({ ...prev, [file._id]: '' }));
                                    } catch (err: any) {
                                      alert(err.response?.data?.message || 'Error approving file');
                                    } finally {
                                      setActionLoading('');
                                    }
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4" /> Approve</Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="rounded-full px-3 py-1 text-xs font-semibold"
                                  disabled={actionLoading === file._id}
                                  onClick={async () => {
                                    setActionLoading(file._id);
                                    try {
                                      const remark = remarkInput[file._id] || '';
                                      const token = localStorage.getItem('token');
                                      await axios.post(`/api/file-action/${file._id}`, { action: 'reject', remark }, {
                                        headers: { Authorization: `Bearer ${token}` }
                                      });
                                      setSharedFiles(prev => prev.filter(f => f._id !== file._id));
                                      setRemarkInput(prev => ({ ...prev, [file._id]: '' }));
                                    } catch (err: any) {
                                      alert(err.response?.data?.message || 'Error rejecting file');
                                    } finally {
                                      setActionLoading('');
                                    }
                                  }}
                                >
                                  <XCircle className="w-4 h-4" /> Reject</Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-full px-2 py-1 text-xs font-semibold"
                                  title="Share for Approval"
                                  onClick={() => {
                                    setShareFileId(file._id);
                                    setShareModalOpen(true);
                                  }}
                                >
                                  <Share2 className="w-4 h-4" /> Share
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="rounded-full px-2 py-1 text-xs font-semibold"
                                  title="Preview"
                                  onClick={async () => {
                                    const url = await getFileUrl(file.s3Key);
                                    window.open(url, '_blank');
                                  }}
                                >
                                  <Eye className="w-4 h-4" /> Preview
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
        <ShareDocumentModal
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          fileId={shareFileId || ''}
          onShare={handleShareDocument}
        />
        
        {/* Upload Modal */}
        {uploadModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-squadrun-darker border border-squadrun-primary/30 rounded-2xl shadow-2xl max-w-lg w-full mx-4 transform transition-all duration-300 scale-100">
              <div className="flex justify-between items-center p-6 border-b border-squadrun-primary/20">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-squadrun-primary" />
                  Upload File
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUploadModalOpen(false)}
                  className="text-squadrun-gray hover:text-white hover:bg-squadrun-primary/20 rounded-full w-8 h-8 p-0"
                >
                  <span className="text-lg">×</span>
                </Button>
              </div>
              <div className="p-6">
                <FileUpload onFileUpload={handleFileUpload} />
              </div>
            </div>
          </div>
        )}

        {/* Rename Modal */}
        {renameModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-squadrun-darker border border-squadrun-primary/30 rounded-2xl shadow-2xl max-w-lg w-full mx-4 transform transition-all duration-300 scale-100">
              <div className="flex justify-between items-center p-6 border-b border-squadrun-primary/20">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-squadrun-primary" />
                  Rename File
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRenameModalOpen(false);
                    setNewFileName('');
                    setRenameFileId(null);
                    setRenameFileName('');
                  }}
                  className="text-squadrun-gray hover:text-white hover:bg-squadrun-primary/20 rounded-full w-8 h-8 p-0"
                >
                  <span className="text-lg">×</span>
                </Button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-squadrun-gray mb-2">
                      Current Name
                    </label>
                    <Input
                      value={renameFileName}
                      disabled
                      className="bg-squadrun-darker/50 border-squadrun-primary/30 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      New Name
                    </label>
                    <Input
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      placeholder="Enter new file name"
                      className="bg-squadrun-darker/50 border-squadrun-primary/30 text-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !renameLoading) {
                          handleRenameFile();
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRenameModalOpen(false);
                        setNewFileName('');
                        setRenameFileId(null);
                        setRenameFileName('');
                      }}
                      className="border-squadrun-primary/30 text-white hover:bg-squadrun-primary/20"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleRenameFile}
                      disabled={renameLoading || !newFileName.trim() || newFileName.trim() === renameFileName}
                      className="bg-squadrun-primary hover:bg-squadrun-vivid text-white"
                    >
                      {renameLoading ? 'Renaming...' : 'Rename'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {sharingHistoryModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#100e0e] border border-squadrun-primary/20 rounded-2xl shadow-2xl max-w-lg w-full mx-4 transform transition-all duration-300 scale-100">
              <div className="flex justify-between items-center p-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  Sharing History - {sharingHistoryFileName}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSharingHistoryModalOpen(false)}
                  className="text-squadrun-gray hover:text-white hover:bg-squadrun-primary/20 rounded-full w-8 h-8 p-0"
                >
                  <span className="text-lg">×</span>
                </Button>
              </div>
              <div className="rounded-full border border-squadrun-primary/20">
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {sharingHistoryLoading ? (
                  <div className="text-squadrun-gray">Loading sharing history...</div>
                ) : sharingHistoryError ? (
                  <div className="text-red-500">{sharingHistoryError}</div>
                ) : sharingHistory.length === 0 ? (
                  <div className="text-squadrun-gray">No sharing history found.</div>
                ) : (
                  <ul className="list-disc ml-4">
                    {sharingHistory.map((s, i) => (
                      <li key={s._id || i} className="mb-4">
                        <div>
                          <span className="font-semibold text-squadrun-primary">{s.generatedBy?.email || 'Unknown'}</span>
                          <span className="ml-2 text-squadrun-gray-300">{s.hierarchy}</span>
                          {s.status && (
                            <span className="ml-2 text-squadrun-primary">[{s.status}]</span>
                          )}
                        </div>
                        {s.remarks && s.remarks.text ? (
                          <div className="ml-2 text-squadrun-gray-200">
                            <span className="font-semibold">Remark:</span> {s.remarks.text}
                            {s.remarks.role && (
                              <span className="ml-2 text-squadrun-primary">({s.remarks.role})</span>
                            )}
                          </div>
                        ) : (
                          <div className="ml-2 italic text-squadrun-gray-400">No remark</div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Document Journey Modal */}
        <DocumentJourneyModal
          open={journeyModalOpen}
          onClose={() => setJourneyModalOpen(false)}
          fileId={journeyFileId || ''}
          fileName={journeyFileName}
        />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
