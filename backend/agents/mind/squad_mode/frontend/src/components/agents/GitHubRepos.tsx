import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ExternalLink, Lock, Unlock } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';

interface Repo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
}

export default function GitHubRepos() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(true);
  const [search, setSearch] = useState('');

  const fetchRepos = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/github/user-repos', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.status === 400) {
        // Likely "GitHub not connected"
        setRepos([]);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch repositories');
      }
      const data = await res.json();
      setRepos(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch repositories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (notConnected) {
      return;
    } else {
      fetchRepos();
    }
  }, [notConnected]);

  if (notConnected) {
    return (
      <div className="p-6 mt-10 bg-transparent border border-none mx-10">
        <div className="text-center">
          <FaGithub className="w-12 h-12 text-squadrun-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Connect GitHub Account</h3>
          <p className="text-squadrun-gray mb-4">
            To access your repositories, please connect your GitHub account first.
          </p>
          <Button
            onClick={() => {
              window.location.href = '/api/auth/github/login';
            }}
            className="bg-squadrun-primary hover:bg-squadrun-primary/80 text-white"
          >
            <FaGithub className="w-4 h-4 mr-2" />
            Connect GitHub
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Your GitHub Repositories</h2>
        <Button variant="outline" className="text-squadrun-primary border-squadrun-primary hover:bg-squadrun-primary/20" onClick={fetchRepos}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* {notConnected && (
        <div className="p-6 mt-10 bg-transparent border border-none mx-10">
        <div className="text-center">
          <Github className="w-12 h-12 text-squadrun-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Connect GitHub Account</h3>
          <p className="text-squadrun-gray mb-4">
            To access your repositories, please connect your GitHub account first.
          </p>
          <Button 
            onClick={() => {
              window.location.href = '/api/auth/github/login';
            }}
            className="bg-squadrun-primary hover:bg-squadrun-primary/80 text-white"
          >
            <FaGithub className="w-4 h-4 mr-2" />
            Connect GitHub
          </Button>
        </div>
        </div>
      )} */}

      {loading && (
        <div className="text-squadrun-gray">Loading repositories…</div>
      )}

      {error && (
        <div className="text-red-400 mb-4">{error}</div>
      )}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search repositories..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2 bg-transparent text-white placeholder-squadrun-gray focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {repos
          .filter((repo) => {
            const q = search.trim().toLowerCase();
            if (!q) return true;
            return (
              repo.full_name.toLowerCase().includes(q) ||
              repo.name.toLowerCase().includes(q) ||
              (repo.description ? repo.description.toLowerCase().includes(q) : false) ||
              (repo.language ? repo.language.toLowerCase().includes(q) : false)
            );
          })
          .map((repo) => (
            <Card key={repo.id} className="bg-transparent border border-squadrun-gray/20 rounded-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-base truncate mr-2">{repo.full_name}</CardTitle>
                  {repo.private ? (
                    <Badge variant="secondary" className="bg-white/10 text-white">
                      <Lock className="w-3 h-3 mr-1" /> Private
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-white/10 text-white">
                      <Unlock className="w-3 h-3 mr-1" /> Public
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="text-squadrun-gray">
                <p className="text-sm line-clamp-2 mb-2">{repo.description || 'No description'}</p>
                <div className="flex items-center justify-between text-xs">
                  <span>{repo.language || 'N/A'}</span>
                  <span>⭐ {repo.stargazers_count} · 🍴 {repo.forks_count}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-2">
                  <span>Updated: {new Date(repo.updated_at).toLocaleString()}</span>
                  <a href={repo.html_url} target="_blank" rel="noreferrer" className="text-squadrun-primary hover:underline inline-flex items-center">
                    View <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {!loading && repos.length === 0 && !notConnected && !error && (
        <div className="text-squadrun-gray">No repositories found.</div>
      )}
    </div>
  );
}

