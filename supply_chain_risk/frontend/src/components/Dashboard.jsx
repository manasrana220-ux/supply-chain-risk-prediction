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
  Workflow,
  Sun,
  Moon,
  Camera
} from 'lucide-react';
import SinglePrediction from './SinglePrediction';
import BatchPrediction from './BatchPrediction';
import Analytics from './Analytics';
import UserDirectory from './UserDirectory';
import { API_BASE } from '../config';

export default function Dashboard({ user, onLogout, theme, setTheme }) {
  const [profilePhoto, setProfilePhoto] = useState(user.profile_photo || null);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      try {
        const response = await fetch(`${API_BASE}/api/v1/auth/profile-photo`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.access_token}`
          },
          body: JSON.stringify({ profile_photo: base64String })
        });
        if (!response.ok) {
          throw new Error('Failed to upload profile photo');
        }
        const data = await response.json();
        setProfilePhoto(data.profile_photo);
        // Also update the stored user object in localStorage
        const savedUser = localStorage.getItem('risk_control_user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          parsed.profile_photo = data.profile_photo;
          localStorage.setItem('risk_control_user', JSON.stringify(parsed));
        }
      } catch (err) {
        alert(err.message);
      }
    };
    reader.readAsDataURL(file);
  };
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

  if (user.role === 'admin') {
    menuItems.push({ id: 'users', label: 'User Directory', icon: User });
  }

  return (
    <div className="dashboard-grid">
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.brandContainer}>
          <div style={styles.brand}>
            <Workflow size={28} color="var(--primary)" />
            <span className="display-font" style={styles.brandText}>RiskControl AI</span>
          </div>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={styles.themeToggle}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={18} color="var(--text-secondary)" /> : <Moon size={18} color="var(--text-secondary)" />}
          </button>
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
          <div style={styles.avatarWrapper}>
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" style={styles.avatarImage} />
            ) : (
              <div style={styles.userIcon}>
                <User size={18} color="var(--primary)" />
              </div>
            )}
            <label style={styles.cameraOverlay} title="Upload photo">
              <Camera size={12} color="#fff" />
              <input 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoUpload} 
                style={{ display: 'none' }} 
              />
            </label>
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
          {activeTab === 'users' && user.role === 'admin' && (
            <UserDirectory 
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
    background: 'var(--bg-card)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.75rem',
    height: '100vh',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  brandContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2.5rem',
    width: '100%',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    paddingLeft: '0.5rem',
  },
  brandText: {
    fontSize: '1.25rem',
    color: 'var(--text-primary)',
    fontWeight: '700',
  },
  themeToggle: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    padding: '0.5rem',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color var(--transition-fast), border-color var(--transition-fast)',
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
  avatarWrapper: {
    position: 'relative',
    width: '36px',
    height: '36px',
  },
  avatarImage: {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-sm)',
    objectFit: 'cover',
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
  cameraOverlay: {
    position: 'absolute',
    bottom: '-4px',
    right: '-4px',
    backgroundColor: 'var(--primary)',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '1px solid var(--bg-main)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    transition: 'transform 0.1s ease',
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
    color: 'var(--text-primary)',
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
    color: 'var(--text-primary)',
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
