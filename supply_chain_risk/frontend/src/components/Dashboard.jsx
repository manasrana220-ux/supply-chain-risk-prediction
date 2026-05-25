import React, { useState } from 'react';
import { 
  Sliders, 
  Layers, 
  BarChart3, 
  LogOut, 
  User, 
  ShieldAlert, 
  Activity, 
  FileText,
  Workflow
} from 'lucide-react';
import SinglePrediction from './SinglePrediction';
import BatchPrediction from './BatchPrediction';
import Analytics from './Analytics';

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('single');
  const [predictionStats, setPredictionStats] = useState({
    singleCount: 0,
    batchCount: 0,
    lastPredictionTime: null,
  });

  const incrementSingle = () => {
    setPredictionStats(prev => ({
      ...prev,
      singleCount: prev.singleCount + 1,
      lastPredictionTime: new Date().toLocaleTimeString(),
    }));
  };

  const incrementBatch = (count) => {
    setPredictionStats(prev => ({
      ...prev,
      batchCount: prev.batchCount + count,
      lastPredictionTime: new Date().toLocaleTimeString(),
    }));
  };

  const menuItems = [
    { id: 'single', label: 'Single Prediction', icon: Sliders },
    { id: 'batch', label: 'Batch Processing', icon: Layers },
    { id: 'analytics', label: 'Model Analytics', icon: BarChart3 },
  ];

  return (
    <div className="dashboard-grid">
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <Workflow size={28} color="var(--primary)" />
          <span className="display-font" style={styles.brandText}>RiskControl AI</span>
        </div>

        <nav style={styles.nav}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  ...styles.navItem,
                  backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                }}
              >
                <Icon size={18} color={isActive ? 'var(--primary)' : 'var(--text-secondary)'} />
                <span style={styles.navLabel}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Card */}
        <div style={styles.userCard}>
          <div style={styles.userIcon}>
            <User size={18} color="var(--primary)" />
          </div>
          <div style={styles.userInfo}>
            <span style={styles.username}>{user.username}</span>
            <span style={{
              ...styles.roleBadge,
              backgroundColor: user.role === 'admin' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(99, 102, 241, 0.15)',
              color: user.role === 'admin' ? 'var(--accent)' : 'var(--primary)',
            }}>
              {user.role}
            </span>
          </div>
          <button onClick={onLogout} style={styles.logoutBtn} title="Sign Out">
            <LogOut size={18} color="var(--text-secondary)" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <div>
            <h2 className="display-font" style={styles.headerTitle}>
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
            <p style={styles.headerSubtitle}>
              Supply chain delivery risk assessment and parameter analysis
            </p>
          </div>

          {/* Quick Stats Banner */}
          <div style={styles.statsContainer}>
            <div style={styles.statCard}>
              <Activity size={16} color="var(--primary)" />
              <div style={styles.statInfo}>
                <span style={styles.statVal}>{predictionStats.singleCount}</span>
                <span style={styles.statLabel}>Single Predicts</span>
              </div>
            </div>
            <div style={styles.statCard}>
              <FileText size={16} color="var(--accent)" />
              <div style={styles.statInfo}>
                <span style={styles.statVal}>{predictionStats.batchCount}</span>
                <span style={styles.statLabel}>Batch Records</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Tab Render */}
        <div style={styles.tabContent} className="animate-fade-in">
          {activeTab === 'single' && (
            <SinglePrediction 
              token={user.access_token} 
              onPredictionComplete={incrementSingle} 
              onLogout={onLogout}
            />
          )}
          {activeTab === 'batch' && (
            <BatchPrediction 
              token={user.access_token} 
              onPredictionComplete={incrementBatch} 
              onLogout={onLogout}
            />
          )}
          {activeTab === 'analytics' && (
            <Analytics 
              token={user.access_token} 
              onLogout={onLogout}
            />
          )}
        </div>
      </main>
    </div>
  );
}

const styles = {
  sidebar: {
    background: 'rgba(11, 15, 25, 0.95)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.75rem',
    height: '100vh',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '2.5rem',
    paddingLeft: '0.5rem',
  },
  brandText: {
    fontSize: '1.25rem',
    color: '#fff',
    fontWeight: '700',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    flexGrow: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.85rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '500',
    textAlign: 'left',
    transition: 'background-color var(--transition-fast), color var(--transition-fast)',
  },
  navLabel: {
    whiteSpace: 'nowrap',
  },
  userCard: {
    marginTop: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-color)',
  },
  userIcon: {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--primary-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
    flexGrow: 1,
    overflow: 'hidden',
  },
  username: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  roleBadge: {
    fontSize: '0.7rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    padding: '0.05rem 0.4rem',
    borderRadius: '4px',
    width: 'fit-content',
    letterSpacing: '0.05em',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.5rem',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color var(--transition-fast)',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    }
  },
  main: {
    padding: '2.5rem',
    overflowY: 'auto',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1.5rem',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '1.5rem',
  },
  headerTitle: {
    fontSize: '1.75rem',
    color: '#fff',
    marginBottom: '0.25rem',
  },
  headerSubtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
  },
  statsContainer: {
    display: 'flex',
    gap: '1rem',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1.25rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-color)',
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  statVal: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#fff',
    lineHeight: 1.1,
  },
  statLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tabContent: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
  },
};
