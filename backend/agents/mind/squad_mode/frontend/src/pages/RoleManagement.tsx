import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon, Trash2, Search, Filter, Plus, Shield, Mail, Settings, X, Check, ChevronDown } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import user_edit from '@/assets/images/Dashboard/user_edit.png';

const SUPERADMIN_USERNAME = '';

export default function RoleManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentUserRole = user?.role;
  const [users, setUsers] = useState([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserError, setAddUserError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState({
    admin: true,
    user: true
  });
  const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState('');

  useEffect(() => {
    axios.get('/api/users', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => setUsers(res.data));
  }, []);

  // Filter users based on search and role filter
  const filteredUsers = users.filter((u: any) => {
    const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRoles.admin && (u.role === 'admin' || u.role === 'superadmin') ||
      selectedRoles.user && u.role === 'user';
    return matchesSearch && matchesRole;
  });

  const handleSelectAll = () => {
    setSelectedRoles({ admin: true, user: true });
  };

  const handleDeselectAll = () => {
    setSelectedRoles({ admin: false, user: false });
  };

  const handleRoleToggle = (role: 'admin' | 'user') => {
    setSelectedRoles(prev => ({
      ...prev,
      [role]: !prev[role]
    }));
  };

  const handleApplyFilter = () => {
    setShowFilterModal(false);
  };

  const handleRoleChangeClick = (userEmail: string) => {
    setShowRoleDropdown(showRoleDropdown === userEmail ? null : userEmail);
  };

  const handleRoleSelect = async (userEmail: string, newRole: string) => {
    try {
      await axios.post('/api/change-role', {
        targetUsername: userEmail,
        newRole
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUsers(prev =>
        prev.map(u => u.email === userEmail ? { ...u, role: newRole } : u)
      );
      setShowRoleDropdown(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error changing role');
    }
  };

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showFilterModal) {
        const target = event.target as Element;
        if (!target.closest('.filter-modal-container')) {
          setShowFilterModal(false);
        }
      }
      if (showRoleDropdown) {
        const target = event.target as Element;
        if (!target.closest('.role-dropdown-container')) {
          setShowRoleDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterModal, showRoleDropdown]);

  const handleDeleteUser = async (email: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`/api/delete-user/${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUsers(prev => prev.filter(u => u.email !== email));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error deleting user');
    }
  };

  const handleAddUser = async () => {
    setAddUserError('');
    if (!newUserEmail) return setAddUserError('Email is required');
    if (!newUserName) return setAddUserError('Name is required');
    setAddUserLoading(true);
    try {
      await axios.post('/api/add-user', {
        email: newUserEmail,
        name: newUserName,
        role: newUserRole
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNewUserEmail('');
      setNewUserName('');
      setNewUserRole('user');
      setShowAddUserModal(false);
      axios.get('/api/users', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then(res => setUsers(res.data));
    } catch (err: any) {
      setAddUserError(err.response?.data?.message || 'Error adding user');
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleRoleChange = async (targetUsername: string, newRole: string) => {
    try {
      await axios.post('/api/change-role', {
        targetUsername,
        newRole
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUsers(prev =>
        prev.map(u => u.email === targetUsername ? { ...u, role: newRole } : u)
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error changing role');
    }
  };

  return (
    <div className="min-h-screen bg-[#010409] p-6">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-1 p-4">
        <div>
          <h1 className="text-3xl font-normal text-white mb-2">Manage User Roles</h1>
          <p className="font-light text-gray-400">Update roles for the admins and users.</p>
        </div>        
        <BackButton onClick={() => navigate('/admin')} />
      </div>
      <div className="flex items-center gap-4 mb-4 justify-end">
        {/* Search Bar */}
        <div className="relative flex">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-squadrun-gray w-4 h-4" />
          <Input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-squadrun-gray/20 border-none text-white placeholder-gray-400 rounded-full"
          />
        </div>

        {/* Filter Button */}
        <div className="relative filter-modal-container">
          <Button
            variant="outline"
            onClick={() => setShowFilterModal(!showFilterModal)}
            className="bg-squadrun-gray/20 border-none text-white hover:bg-squadrun-gray/30 rounded-full"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter by Role
          </Button>

          {/* Filter Modal */}
          {showFilterModal && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-[#21262D] border border-gray-700 rounded-lg shadow-xl z-50">
              {/* Header */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-white" />
                  <span className="text-white font-light uppercase text-sm">FILTER USERS BY ROLE</span>
                </div>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="p-1 hover:bg-gray-700 rounded-full transition"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="mx-2 border-b border-gray-700">
              </div>
              {/* Role Checkboxes */}
              <div className="p-4">
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="checkbox"
                        id="admin-checkbox"
                        checked={selectedRoles.admin}
                        onChange={() => handleRoleToggle('admin')}
                        className="sr-only"
                      />
                      <label
                        htmlFor="admin-checkbox"
                        className="w-4 h-4 border border-white rounded flex items-center justify-center cursor-pointer hover:bg-gray-700 transition"
                      >
                        {selectedRoles.admin && <Check className="w-3 h-3 text-white" />}
                      </label>
                    </div>
                    <span className="text-white">Admins</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="checkbox"
                        id="user-checkbox"
                        checked={selectedRoles.user}
                        onChange={() => handleRoleToggle('user')}
                        className="sr-only"
                      />
                      <label
                        htmlFor="user-checkbox"
                        className="w-4 h-4 border border-white rounded flex items-center justify-center cursor-pointer hover:bg-gray-700 transition"
                      >
                        {selectedRoles.user && <Check className="w-3 h-3 text-white" />}
                      </label>
                    </div>
                    <span className="text-white">Users</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mx-2 flex items-center justify-between p-4 border-t border-gray-700">
                <div className="flex gap-4">
                  <button
                    onClick={handleSelectAll}
                    className="text-[#79C0FF] hover:text-[#79C0FF]/80 text-sm font-medium transition"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="text-[#79C0FF] hover:text-[#79C0FF]/80 text-sm font-medium transition"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add New User Button */}
        {(currentUserRole === 'superadmin' || currentUserRole === 'admin') && (
          <Button
            onClick={() => setShowAddUserModal(true)}
            className="bg-[#4F52B2] hover:bg-[#4F52B2]/80 rounded-full text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New User
          </Button>
        )}
      </div>
      {/* User Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredUsers.map((u: any) => (
          <Card key={u.email} className="bg-[#21262D] border-none rounded-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {/* User Name */}
                  <h3 className="text-white font-semibold text-lg mb-2">
                    {u.name || u.email.split('@')[0]}
                  </h3>

                  {/* Role with Icon */}
                  <div className="flex items-center gap-2 mb-2 text-[#79C0FF]">
                    {u.role === 'admin' || u.role === 'superadmin' ? (
                      <Shield className="w-4 h-4 text-[#79C0FF]" />
                    ) : (
                      <UserIcon className="w-4 h-4 text-[#79C0FF]" />
                    )}
                    <span className="text-[#79C0FF] text-sm capitalize">{u.role}</span>
                    <Mail className="ml-2 w-4 h-4 text-[#79C0FF]" />
                    <span className="text-[#79C0FF] text-sm">{u.email}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                {(currentUserRole === 'superadmin' || currentUserRole === 'admin') && u.email !== SUPERADMIN_USERNAME && (
                  <div className="flex gap-2">
                    {/* Role Change Dropdown */}
                    <div className="relative role-dropdown-container">
                      <button
                        onClick={() => handleRoleChangeClick(u.email)}
                        className="p-2 bg-gray-600/20 hover:bg-gray-600/30 rounded-full transition"
                        title="Change role"
                      >
                        <img src={user_edit} className="w-4 h-4 text-gray-400" />
                      </button>

                      {showRoleDropdown === u.email && (
                        <div className="absolute top-full right-0 mt-1 w-32 bg-[#21262D] border border-gray-700 rounded-lg shadow-xl z-50">
                          <div className="py-1">
                            <button
                              onClick={() => handleRoleSelect(u.email, 'user')}
                              className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 text-sm flex items-center gap-2"
                            >
                              <UserIcon className="w-3 h-3" />
                              User
                            </button>
                            <button
                              onClick={() => handleRoleSelect(u.email, 'admin')}
                              className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 text-sm flex items-center gap-2"
                            >
                              <Shield className="w-3 h-3" />
                              Admin
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteUser(u.email)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0D1117] border-none rounded-lg w-[600px] max-w-[90vw]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <Plus className="w-4 h-4 text-white" />
                <h2 className="text-md font-light text-white">ADD NEW USER</h2>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="p-1 hover:bg-gray-700 rounded-full transition"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* User Information Section */}
              <div>
                <h3 className="text-white font-extralight mb-4">Enter the new user's information</h3>
                <div>
                  <Input
                    type="email"
                    placeholder="Enter the new user's email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="bg-transparent border border-gray-600 text-white placeholder-gray-400 rounded-full"
                  />
                </div>
              </div>

              {/* Role Selection Section */}
              <div>
                <h3 className="text-white font-extralight mb-4">Select a role for the new user</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setNewUserRole('admin')}
                    className={`p-4 rounded-lg border-2 transition-all ${newUserRole === 'admin'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                      }`}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-full h-full bg-transparent flex items-center gap-3 justify-center">
                        <Shield className="w-6 h-6 text-gray-400" />
                        <span className="text-white font-medium">Admin</span>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setNewUserRole('user')}
                    className={`p-4 rounded-lg border-2 transition-all ${newUserRole === 'user'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                      }`}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-full h-full bg-transparent flex items-center gap-3 justify-center">
                        <UserIcon className="w-6 h-6 text-gray-400" />
                        <span className="text-white font-medium">User</span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {addUserError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{addUserError}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center p-6 border-t border-gray-700">
              <div className="flex justify-end w-full">
                <Button
                  onClick={handleAddUser}
                  disabled={addUserLoading}
                  className="bg-[#4F52B2] hover:bg-[#4F52B2]/80 text-white rounded-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {addUserLoading ? 'Adding...' : 'Add User'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
