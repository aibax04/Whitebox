import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  User, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowRight,
  Upload,
  Share2,
  Users
} from 'lucide-react';

interface DocumentJourneyModalProps {
  open: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
}

interface JourneyStep {
  id: string;
  type: 'upload' | 'share' | 'approve' | 'reject' | 'pending';
  user: {
    email: string;
    role: string;
    name?: string;
  };
  date: string;
  status: string;
  remark?: string;
  hierarchy?: string;
}

const DocumentJourneyModal: React.FC<DocumentJourneyModalProps> = ({
  open,
  onClose,
  fileId,
  fileName
}) => {
  const [journey, setJourney] = useState<JourneyStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && fileId) {
      fetchDocumentJourney();
    }
  }, [open, fileId]);

  const fetchDocumentJourney = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch sharing history and file details
      const [sharingRes, fileRes] = await Promise.all([
        axios.get(`/api/sharing-status/${fileId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('/api/files', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const sharingHistory = sharingRes.data;
      const files = fileRes.data;
      const file = files.find((f: any) => f._id === fileId);

      // Build journey steps
      const steps: JourneyStep[] = [];

      // Add upload step
      if (file) {
        // Handle both populated object and ObjectId string
        const generatedBy = typeof file.generatedBy === 'object' && file.generatedBy !== null 
          ? file.generatedBy 
          : null;
        
        steps.push({
          id: 'upload',
          type: 'upload',
          user: {
            email: generatedBy?.email || 'Unknown',
            role: generatedBy?.role || 'user',
            name: generatedBy?.name || generatedBy?.email?.split('@')[0] || 'Unknown User'
          },
          date: file.updatedAt || new Date().toISOString(),
          status: 'Uploaded'
        });
      }

      // Add sharing and approval steps
      sharingHistory.forEach((share: any) => {
        // Determine step type based on status
        let stepType: JourneyStep['type'] = 'pending';
        if (share.status?.includes('Approved')) {
          stepType = 'approve';
        } else if (share.status?.includes('Rejected')) {
          stepType = 'reject';
        } else if (share.status?.includes('Pending')) {
          stepType = 'pending';
        } else {
          stepType = 'share';
        }

        // Handle both populated object and ObjectId string
        const shareGeneratedBy = typeof share.generatedBy === 'object' && share.generatedBy !== null 
          ? share.generatedBy 
          : null;
        
        steps.push({
          id: share._id,
          type: stepType,
          user: {
            email: shareGeneratedBy?.email || 'Unknown',
            role: shareGeneratedBy?.role || 'user',
            name: shareGeneratedBy?.name || shareGeneratedBy?.email?.split('@')[0] || 'Unknown User'
          },
          date: share.updatedAt || share.createdAt,
          status: share.status || 'Shared',
          remark: share.remarks?.text,
          hierarchy: share.hierarchy
        });
      });

      // Sort by date
      steps.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setJourney(steps);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch document journey');
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (type: JourneyStep['type']) => {
    switch (type) {
      case 'upload':
        return <Upload className="w-5 h-5" />;
      case 'share':
        return <Share2 className="w-5 h-5" />;
      case 'approve':
        return <CheckCircle className="w-5 h-5" />;
      case 'reject':
        return <XCircle className="w-5 h-5" />;
      case 'pending':
        return <Clock className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getStepColor = (type: JourneyStep['type']) => {
    switch (type) {
      case 'upload':
        return 'bg-blue-500/20 border-blue-500 text-blue-400';
      case 'share':
        return 'bg-purple-500/20 border-purple-500 text-purple-400';
      case 'approve':
        return 'bg-green-500/20 border-green-500 text-green-400';
      case 'reject':
        return 'bg-red-500/20 border-red-500 text-red-400';
      case 'pending':
        return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      default:
        return 'bg-gray-500/20 border-gray-500 text-gray-400';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'superadmin':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'admin':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'user':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden bg-[#100e0e]">
        <DialogHeader className="border-b border-border/50 pb-4">
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            Document Journey: {fileName}
          </DialogTitle>
          <p className="text-muted-foreground mt-2">Track the complete lifecycle and approval workflow of your document</p>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(95vh-180px)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
              </div>
              <span className="mt-4 text-muted-foreground font-medium">Tracing document journey...</span>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-red-400 text-lg font-semibold">{error}</p>
              <Button 
                onClick={fetchDocumentJourney} 
                className="mt-6 bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                variant="outline"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Retry Journey
              </Button>
            </div>
          ) : journey.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-lg font-medium">No journey data available</p>
              <p className="text-muted-foreground/70 text-sm mt-1">This document hasn't started its approval journey yet</p>
            </div>
          ) : (
            <div>
          {/* Enhanced summary stats */}
            <div className="bg-[#100e0e] border border-border/30 rounded-2xl p-6">
            <h4 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#100e0e] flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              Journey Analytics
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-card/50 backdrop-blur-sm border border-border/30 rounded-xl p-4 text-center hover:scale-105 transition-transform">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">
                  {new Set(journey.map(step => step.user.email)).size}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Participants</p>
              </div>
              
              <div className="bg-card/50 backdrop-blur-sm border border-border/30 rounded-xl p-4 text-center hover:scale-105 transition-transform">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
                  <Share2 className="w-6 h-6 text-purple-400" />
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">{journey.length}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Steps</p>
              </div>
              
              <div className="bg-card/50 backdrop-blur-sm border border-border/30 rounded-xl p-4 text-center hover:scale-105 transition-transform">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">
                  {journey.filter(s => s.type === 'approve').length}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Approvals</p>
              </div>
              
              <div className="bg-card/50 backdrop-blur-sm border border-border/30 rounded-xl p-4 text-center hover:scale-105 transition-transform">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                  journey[journey.length - 1]?.type === 'approve' ? 'bg-green-500/20' :
                  journey[journey.length - 1]?.type === 'reject' ? 'bg-red-500/20' :
                  'bg-yellow-500/20'
                }`}>
                  <Clock className={`w-6 h-6 ${
                    journey[journey.length - 1]?.type === 'approve' ? 'text-green-400' :
                    journey[journey.length - 1]?.type === 'reject' ? 'text-red-400' :
                    'text-yellow-400'
                  }`} />
                </div>
                <p className="text-lg font-bold text-foreground mb-1 capitalize">
                  {journey[journey.length - 1]?.status || 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Status</p>
              </div>
            </div>
          </div>
            <div>
              {/* Enhanced Journey Flowchart */}
              <div className="relative bg-[#100e0e] rounded-2xl p-6 border border-border/30">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Document Flow Timeline</h3>
                </div>
                
                {/* Enhanced Timeline with better visual flow */}
                <div className="relative">
                  {/* Main timeline backbone */}
                  <div className="absolute left-12 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/60 via-primary/40 to-primary/20 rounded-full"></div>
                  
                  {journey.map((step, index) => (
                    <div key={step.id} className="relative mb-12 last:mb-0">
                      {/* Flow connector line to content */}
                      <div className="absolute left-12 top-6 w-8 h-0.5 bg-gradient-to-r from-primary/60 to-border"></div>
                      
                      {/* Step indicator with enhanced design */}
                      <div className={`absolute left-6 top-2 w-12 h-12 rounded-xl border-3 flex items-center justify-center z-10 shadow-lg transform transition-all duration-300 hover:scale-110 ${getStepColor(step.type)} backdrop-blur-sm`}>
                        {getStepIcon(step.type)}
                        
                        {/* Step number badge */}
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-primary-foreground">{index + 1}</span>
                        </div>
                      </div>

                      {/* Enhanced step content card */}
                      <div className="ml-24 group">
                        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-primary/30">
                          {/* Header with better visual hierarchy */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-xl font-bold text-foreground">
                                  {step.type === 'upload' ? '📤 Document Uploaded' :
                                   step.type === 'share' ? '🔄 Document Shared' :
                                   step.type === 'approve' ? '✅ Document Approved' :
                                   step.type === 'reject' ? '❌ Document Rejected' :
                                   '⏳ Pending Review'}
                                </h3>
                                <div className={`px-3 py-1 rounded-lg text-xs font-bold border-2 ${getStepColor(step.type)} animate-pulse`}>
                                  {step.status}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>{new Date(step.date).toLocaleString('en-US', { 
                                  weekday: 'short', 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}</span>
                              </div>
                            </div>
                          </div>

                          {/* Enhanced user information card */}
                          <div className="bg-muted/20 border border-border/30 rounded-lg p-4 mb-4">
                            <div className="flex items-center space-x-4">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${getRoleColor(step.user.role)}`}>
                                {(step.user.name || step.user.email)?.[0]?.toUpperCase() || '?'}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-foreground">
                                    {step.user.name || step.user.email?.split('@')[0] || 'Unknown User'}
                                  </p>
                                  <div className={`px-2 py-1 rounded-md text-xs font-bold border ${getRoleColor(step.user.role)}`}>
                                    {step.user.role?.toUpperCase() || 'USER'}
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {step.user.email || 'No email provided'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Action details grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Workflow hierarchy */}
                            {step.hierarchy && (
                              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-4 h-4 rounded bg-primary/30"></div>
                                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">Workflow Path</span>
                                </div>
                                <p className="text-sm text-foreground font-mono bg-primary/10 rounded px-2 py-1">
                                  {step.hierarchy}
                                </p>
                              </div>
                            )}
                          {step.remark && (
                            <div className="bg-gradient-to-r from-accent/10 to-accent/5 border border-primary/20 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-4 h-4 rounded-full bg-accent/30"></div>
                                <span className="text-xs font-semibold text-accent uppercase tracking-wide">Review Comment</span>
                              </div>
                              <blockquote className="text-sm text-foreground italic border-l-2 border-accent/30 pl-3">
                                "{step.remark}"
                              </blockquote>
                            </div>
                          )}
                            
                          </div>
                        </div>
                      </div>

                      {/* Enhanced flow arrow */}
                      {index < journey.length - 1 && (
                        <div className="flex justify-center my-6">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                              <ArrowRight className="w-4 h-4 text-primary transform rotate-90" />
                            </div>
                            <div className="h-4 w-0.5 bg-gradient-to-b from-primary/60 to-transparent"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


export default DocumentJourneyModal;