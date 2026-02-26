import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import axios from 'axios';

interface ShareDocumentModalProps {
  open: boolean;
  onClose: () => void;
  fileId: string;
  onShare: (fileId: string, email: string, remark: string) => Promise<void>;
}

const ShareDocumentModal: React.FC<ShareDocumentModalProps> = ({ open, onClose, fileId, onShare }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [remark, setRemark] = useState('');

  useEffect(() => {
    if (open) {
      setRemark('');
      setSearchQuery('');
      const fetchUsers = async () => {
        try {
          const res = await axios.get('/api/users', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setUsers(res.data);
          setFilteredUsers(res.data);
        } catch (err) {
          setUsers([]);
          setFilteredUsers([]);
        }
      };
      fetchUsers();
    }
  }, [open]);

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const handleShare = async (email: string) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await onShare(fileId, email, remark);
      setSuccess('Document shared successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to share document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Document for Approval</DialogTitle>
        </DialogHeader>
        <div className="my-4">
          <div className="mb-2 text-sm text-squadrun-gray">Add a remark (optional):</div>
          <textarea
            className="w-full p-2 rounded bg-squadrun-darker/80 text-white border border-squadrun-primary/30 mb-4"
            rows={2}
            placeholder="Enter remark for this sharing (optional)"
            value={remark}
            onChange={e => setRemark(e.target.value)}
          />
          <div className="mb-2 text-sm text-squadrun-gray">Search and select a user to share with:</div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-squadrun-gray w-4 h-4" />
            <Input
              type="text"
              placeholder="Search users by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-squadrun-darker/80 text-white border-squadrun-primary/30 focus:border-squadrun-primary"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredUsers.length === 0 && searchQuery.trim() && (
              <div className="text-squadrun-gray text-center py-4">No users found matching "{searchQuery}"</div>
            )}
            {filteredUsers.length === 0 && !searchQuery.trim() && (
              <div className="text-squadrun-gray text-center py-4">No users found.</div>
            )}
            {filteredUsers.map(u => (
              <div key={u.email} className="flex items-center justify-between py-2 px-3 border-b border-squadrun-primary/10 hover:bg-squadrun-primary/10 rounded cursor-pointer">
                <div>
                  <span className="font-semibold text-white">{u.name || u.email}</span>
                  <span className="ml-2 text-xs text-squadrun-gray">({u.role})</span>
                </div>
                <Button size="sm" disabled={loading} onClick={() => handleShare(u.email)}>
                  Share
                </Button>
              </div>
            ))}
          </div>
        </div>
        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
        {success && <div className="text-green-500 text-sm mb-2">{success}</div>}
      </DialogContent>
    </Dialog>
  );
};

export default ShareDocumentModal;
