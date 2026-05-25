import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import { Users, User, Shield, Search, RefreshCw, AlertCircle } from 'lucide-react';

export default function UserDirectory({ token, onLogout }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          if (onLogout) onLogout();
          return;
        }
        throw new Error('Failed to retrieve user directory.');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const adminCount = users.filter(u => u.role === 'admin').length;
  const analystCount = users.filter(u => u.role === 'analyst').length;

  return (
    <div style={styles.container}>
      {/* Stats row */}
      <div style={styles.statsRow}>
        <div className="glass-panel" style={styles.statCard}>
          <Users size={20} color="var(--primary)" />
          <div style={styles.statInfo}>
            <span style={styles.statVal}>{users.length}</span>
            <span style={styles.statLabel}>Total Accounts</span>
          </div>
        </div>
        <div className="glass-panel" style={styles.statCard}>
          <Shield size={20} color="var(--accent)" />
          <div style={styles.statInfo}>
            <span style={styles.statVal}>{adminCount}</span>
            <span style={styles.statLabel}>Administrators</span>
          </div>
        </div>
        <div className="glass-panel" style={styles.statCard}>
          <User size={20} color="var(--color-low)" />
          <div style={styles.statInfo}>
            <span style={styles.statVal}>{analystCount}</span>
            <span style={styles.statLabel}>Analysts</span>
          </div>
        </div>
      </div>

      {/* Directory Search & List */}
      <div className="glass-panel" style={styles.listCard}>
        <div style={styles.cardHeader}>
          <div style={styles.searchWrapper}>
            <Search size={18} style={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search users by name or role..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <button onClick={fetchUsers} style={styles.refreshBtn} title="Refresh Directory">
            <RefreshCw size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {error && (
          <div style={styles.errorContainer}>
            <AlertCircle size={18} color="var(--color-high)" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner} />
            <span style={styles.loadingText}>Fetching registered users...</span>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Username</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={styles.noResults}>
                      No users match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, i) => (
                    <tr key={i} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.userProfile}>
                          {u.profile_photo ? (
                            <img src={u.profile_photo} alt="Avatar" style={styles.avatar} />
                          ) : (
                            <div style={styles.avatarFallback}>
                              <User size={14} color="var(--primary)" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ ...styles.td, fontWeight: '600', color: 'var(--text-primary)' }}>
                        {u.username}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.roleBadge,
                          backgroundColor: u.role === 'admin' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                          color: u.role === 'admin' ? 'var(--accent)' : 'var(--primary)',
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: u.is_active ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                          color: u.is_active ? 'var(--color-low)' : 'var(--color-high)',
                        }}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1.5rem',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  statVal: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    lineHeight: 1.1,
  },
  statLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '0.2rem',
  },
  listCard: {
    padding: '2rem',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1.5rem',
    marginBottom: '2rem',
    flexWrap: 'wrap',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flexGrow: 1,
    maxWidth: '450px',
  },
  searchIcon: {
    position: 'absolute',
    left: '1rem',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 1rem 0.75rem 2.75rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
  },
  refreshBtn: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color var(--transition-fast)',
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-high)',
    border: '1px solid var(--border-high)',
    color: 'var(--color-high)',
    marginBottom: '1.5rem',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 0',
    gap: '1rem',
  },
  spinner: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '3px solid rgba(99, 102, 241, 0.1)',
    borderTopColor: 'var(--primary)',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    padding: '1rem',
    borderBottom: '2px solid var(--border-color)',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: '600',
  },
  tr: {
    borderBottom: '1px solid var(--border-color)',
    transition: 'background-color var(--transition-fast)',
  },
  td: {
    padding: '1rem',
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
    verticalAlign: 'middle',
  },
  userProfile: {
    display: 'flex',
    alignItems: 'center',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-sm)',
    objectFit: 'cover',
    border: '1px solid var(--border-color)',
  },
  avatarFallback: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--primary-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadge: {
    fontSize: '0.75rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    letterSpacing: '0.05em',
  },
  statusBadge: {
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    letterSpacing: '0.05em',
  },
  noResults: {
    padding: '3rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
  }
};
