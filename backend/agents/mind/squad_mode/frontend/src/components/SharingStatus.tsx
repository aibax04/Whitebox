import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface SharingStatusProps {
  fileId: string;
}

const SharingStatus: React.FC<SharingStatusProps> = ({ fileId }) => {
  const [sharing, setSharing] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!fileId) return;
    setLoading(true);
    axios.get(`/api/sharing-status/${fileId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => setSharing(res.data))
      .catch(err => setError(err.response?.data?.message || 'Error fetching sharing status'))
      .finally(() => setLoading(false));
  }, [fileId]);

  if (!fileId) return null;
  if (loading) return <div className="text-xs text-squadrun-gray">Loading sharing status...</div>;
  if (error) return <div className="text-xs text-red-500">{error}</div>;
  if (!sharing.length) return <div className="text-xs text-squadrun-gray">Not shared yet.</div>;

  return (
    <div className="text-xs text-squadrun-gray mt-1">
      <div className="font-semibold text-squadrun-primary mb-1">Sharing History:</div>
      <ul className="list-disc ml-4">
        {sharing.map((s, i) => (
          <li key={s._id || i} className="mb-2">
            <div>
              <span className="font-semibold">{s.generatedBy?.email || 'Unknown'}</span> {s.hierarchy}
              {s.status && (
                <span className="ml-2 text-squadrun-primary">[{s.status}]</span>
              )}
            </div>
            {s.remarks && s.remarks.text ? (
              <div className="ml-2 text-squadrun-gray-700">
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
    </div>
  );
};

export default SharingStatus;
