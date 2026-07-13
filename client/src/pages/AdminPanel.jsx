import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || "https://emotional-ai-18zi.onrender.com";

export default function AdminPanel({ session }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('requests'); // 'requests', 'users', 'exports'
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [exportRequests, setExportRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userEmail = session?.user?.email;

  useEffect(() => {
    // Basic protection on frontend, backed by backend
    if (userEmail !== 'sns@mayhere.com') {
      navigate('/');
      return;
    }
    fetchData();
  }, [userEmail, activeTab]);

  const token = session?.access_token;

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'requests') {
        const res = await fetch(`${API_BASE}/api/admin/requests`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({ userEmail })
        });
        if (!res.ok) throw new Error('Failed to fetch requests');
        const data = await res.json();
        setRequests(data);
      } else if (activeTab === 'users') {
        const res = await fetch(`${API_BASE}/api/admin/users`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({ userEmail })
        });
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        setUsers(data);
      } else if (activeTab === 'exports') {
        import('../lib/supabaseClient').then(async ({ supabase }) => {
          const { data, error } = await supabase.from('data_export_requests').select('*').order('created_at', { ascending: false });
          if (error) throw new Error(error.message);
          setExportRequests(data || []);
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveExport = async (reqId, user_email) => {
    if (!window.confirm(`Approve export for ${user_email} and send email?`)) return;
    try {
      const { supabase } = await import('../lib/supabaseClient');
      const { error } = await supabase.from('data_export_requests').update({ status: 'approved' }).eq('id', reqId);
      if (error) throw error;
      alert(`Export approved! Data packaging initiated for ${user_email}.`);
      fetchData(); // refresh list
    } catch (err) {
      alert("Failed to approve export: " + err.message);
    }
  };

  const handleApprove = async (requestId, userId, tier) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ userEmail, requestId, userId, tier })
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (requestId) => {
    if (!window.confirm("Reject this payment?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/reject`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ userEmail, requestId })
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleBlock = async (userId, currentBlockStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/block`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ userEmail, userId, block: !currentBlockStatus })
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTier = async (userId, currentTier) => {
    const targetTier = currentTier === 'premium' ? 'free' : 'premium';
    if (!window.confirm(`Change user's tier to ${targetTier.toUpperCase()}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/update-tier`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ userEmail, userId, tier: targetTier })
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangePassword = async (userId) => {
    const newPassword = window.prompt("Enter new password for this user:");
    if (!newPassword) return;
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/admin/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ userEmail, userId, newPassword })
      });
      if (res.ok) {
        alert("Password updated successfully!");
      } else {
        alert("Failed to update password.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (!window.confirm(`⚠️ WARNING: Are you absolutely sure you want to permanently DELETE user "${email}"?\n\nThis will hard-delete their account from Supabase Auth and cascade delete all their psychological data (diaries, dreams, memories, wellness scores) forever. This action CANNOT be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/delete-user`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ userEmail, userId })
      });
      if (res.ok) {
        alert("User and all data deleted successfully!");
        fetchData();
      } else {
        const errData = await res.json();
        alert(`Failed to delete user: ${errData.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert("Error contacting the admin API.");
    }
  };

  if (userEmail !== 'sns@mayhere.com') return null;

  return (
    <div className="min-h-screen bg-[#050510] text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">
            God Mode Dashboard
          </h1>
          <button onClick={() => navigate('/')} className="px-4 py-2 border border-white/20 rounded-full hover:bg-white/10 text-sm">
            Exit
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-white/10 pb-4 mb-8">
          <button 
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'requests' ? 'bg-fuchsia-500 text-white' : 'text-white/60 hover:bg-white/5'}`}
          >
            Subscription Requests
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'users' ? 'bg-indigo-500 text-white' : 'text-white/60 hover:bg-white/5'}`}
          >
            Manage Users
          </button>
          <button 
            onClick={() => setActiveTab('exports')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'exports' ? 'bg-amber-500 text-white' : 'text-white/60 hover:bg-white/5'}`}
          >
            Data Exports
          </button>
        </div>

        {error && <div className="bg-red-500/20 text-red-300 p-4 rounded-xl mb-6">{error}</div>}

        {loading && activeTab !== 'exports' ? (
          <div className="text-center text-gray-500 py-12">Loading matrix data...</div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-black/40 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
            {activeTab === 'requests' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400">
                      <th className="p-4 font-semibold text-sm">Date</th>
                      <th className="p-4 font-semibold text-sm">User Email</th>
                      <th className="p-4 font-semibold text-sm">Order ID</th>
                      <th className="p-4 font-semibold text-sm">UTR Number</th>
                      <th className="p-4 font-semibold text-sm">Tier</th>
                      <th className="p-4 font-semibold text-sm">Status</th>
                      <th className="p-4 font-semibold text-sm text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.length === 0 ? (
                      <tr><td colSpan="7" className="p-8 text-center text-gray-500">No requests found.</td></tr>
                    ) : (
                      requests.map(req => (
                        <tr key={req.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-4 text-sm text-gray-300">{new Date(req.created_at).toLocaleString()}</td>
                          <td className="p-4 text-sm">{req.user_email}</td>
                          <td className="p-4 text-sm font-mono text-cyan-400">{req.order_id}</td>
                          <td className="p-4 text-sm font-mono text-fuchsia-400">{req.utr}</td>
                          <td className="p-4 text-sm capitalize">Premium</td>
                          <td className="p-4 text-sm">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              req.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                              req.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {req.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-right flex justify-end gap-2">
                            {req.status === 'pending' && (
                              <>
                                <button onClick={() => handleApprove(req.id, req.user_id, 'premium')} className="px-3 py-1 bg-green-600/80 hover:bg-green-500 text-white rounded text-xs">Approve</button>
                                <button onClick={() => handleReject(req.id)} className="px-3 py-1 bg-red-600/80 hover:bg-red-500 text-white rounded text-xs">Reject</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400">
                      <th className="p-4 font-semibold text-sm">User ID</th>
                      <th className="p-4 font-semibold text-sm">Email</th>
                      <th className="p-4 font-semibold text-sm">Tier</th>
                      <th className="p-4 font-semibold text-sm">Expires</th>
                      <th className="p-4 font-semibold text-sm text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4 text-xs text-gray-500 font-mono truncate max-w-[100px]">{u.id}</td>
                        <td className="p-4 text-sm">{u.email}</td>
                        <td className="p-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${u.subscription?.tier === 'premium' && u.subscription?.status === 'active' ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'bg-gray-500/20 text-gray-400'}`}>
                            {(u.subscription?.tier || 'FREE').toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-400">
                          {u.subscription?.ends_at ? new Date(u.subscription.ends_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          <button 
                            onClick={() => handleUpdateTier(u.id, u.subscription?.tier)} 
                            className={`px-3 py-1 rounded text-xs font-semibold ${u.subscription?.tier === 'premium' && u.subscription?.status === 'active' ? 'bg-amber-600/80 hover:bg-amber-500' : 'bg-fuchsia-600/80 hover:bg-fuchsia-500'} text-white`}
                          >
                            {u.subscription?.tier === 'premium' && u.subscription?.status === 'active' ? 'Set Free' : 'Set Premium'}
                          </button>
                          <button 
                            onClick={() => handleChangePassword(u.id)} 
                            className="px-3 py-1 bg-blue-600/80 hover:bg-blue-500 rounded text-xs text-white"
                          >
                            Reset Pass
                          </button>
                          <button 
                            onClick={() => handleToggleBlock(u.id, u.is_blocked)} 
                            className={`px-3 py-1 rounded text-xs ${u.is_blocked ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600/80 hover:bg-red-500'} text-white`}
                          >
                            {u.is_blocked ? 'Unblock' : 'Block'}
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u.id, u.email)} 
                            className="px-3 py-1 bg-red-800 hover:bg-red-700 rounded text-xs text-white font-bold"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'exports' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-amber-400 mb-4">Pending Export Requests</h2>
                {exportRequests.length === 0 ? (
                  <div className="text-white/50 text-center py-10 bg-black/40 rounded-xl border border-white/5">
                    No export requests found.
                  </div>
                ) : (
                  exportRequests.map(req => (
                    <div key={req.id} className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">{req.email}</div>
                        <div className="text-xs text-white/50">Requested: {new Date(req.created_at).toLocaleString()}</div>
                        <div className="text-xs mt-1">
                          Status: <span className={req.status === 'approved' ? 'text-emerald-400' : 'text-amber-400'}>{req.status.toUpperCase()}</span>
                        </div>
                      </div>
                      {req.status === 'pending' && (
                        <button 
                          onClick={() => handleApproveExport(req.id, req.email)}
                          className="px-4 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors font-medium text-sm border border-emerald-500/30"
                        >
                          Approve & Email
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
