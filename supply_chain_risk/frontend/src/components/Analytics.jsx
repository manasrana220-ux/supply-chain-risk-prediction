import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  Cpu, 
  Info, 
  Sliders, 
  Activity, 
  AlertCircle,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

export default function Analytics({ token, onLogout }) {
  const [modelMeta, setModelMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sensitivity analyzer state
  const [sensFeature, setSensFeature] = useState('Disruption_Score');
  const [sensValue, setSensValue] = useState(4.0);
  const [sensResult, setSensResult] = useState(null);
  const [sensLoading, setSensLoading] = useState(false);

  // Baseline features for sensitivity analysis
  const BASELINE_FEATURES = {
    Traffic_Level: 4.5,
    ETA_Variation: 12.0,
    Weather_Severity: 3.0,
    Loading_Time: 30.0,
    Route_Risk: 4.0,
    Delivery_Time_Deviation: 10.0,
    Disruption_Score: 4.0,
    Fuel_Rate: 11.0,
    Vehicle_Capacity: 0.8,
    Warehouse_ID: 'W001',
    Order_Status: 0.0,
    Cargo_Condition: 0.8,
    Driver_Fatigue: 3.5,
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (modelMeta) {
      runSensitivityPrediction();
    }
  }, [sensFeature, sensValue, modelMeta]);

  const fetchMetadata = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/v1/features', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          if (onLogout) onLogout();
          return;
        }
        throw new Error('Failed to retrieve model features.');
      }
      const data = await response.json();
      setModelMeta(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runSensitivityPrediction = async () => {
    setSensLoading(true);
    try {
      const payload = {
        ...BASELINE_FEATURES,
        [sensFeature]: sensValue
      };

      const response = await fetch('/api/v1/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 401) {
          if (onLogout) onLogout();
          return;
        }
        throw new Error('Sensitivity prediction error');
      }
      
      const data = await response.json();
      setSensResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSensLoading(false);
    }
  };

  const getImportanceChartData = () => {
    if (!modelMeta) return [];
    return Object.entries(modelMeta.importances)
      .map(([name, val]) => ({
        name: name.replace(/_/g, ' '),
        rawName: name,
        Importance: Math.round(val * 1000) / 10
      }))
      .sort((a, b) => b.Importance - a.Importance);
  };

  const getRiskColor = (risk) => {
    if (risk === 'High') return 'var(--color-high)';
    if (risk === 'Moderate') return 'var(--color-moderate)';
    return 'var(--color-low)';
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <RefreshCw className="animate-spin" size={32} color="var(--primary)" />
        <span style={{marginTop: '1rem', color: 'var(--text-secondary)'}}>Loading Model Meta...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={styles.errorCard}>
        <AlertCircle size={24} color="var(--color-high)" />
        <h4 style={{color: '#fff', margin: '0.5rem 0'}}>Failed to Load Analytics</h4>
        <p style={{color: 'var(--text-secondary)', fontSize: '0.85rem'}}>{error}</p>
        <button onClick={fetchMetadata} style={styles.retryBtn}>Retry</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Upper Grid: Model Stats & Features list */}
      <div style={styles.metaGrid}>
        
        {/* Model Architecture Info */}
        <div className="glass-panel" style={styles.card}>
          <div style={styles.cardHeader}>
            <Cpu size={18} color="var(--primary)" />
            <h4 className="display-font" style={styles.cardTitle}>Model Parameters</h4>
          </div>
          
          <div style={styles.metaList}>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Algorithm</span>
              <span style={styles.metaVal}>RandomForestClassifier</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Number of Trees</span>
              <span style={styles.metaVal}>{modelMeta.n_estimators || 100}</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Output Classes</span>
              <div style={styles.badgesRow}>
                {modelMeta.classes?.map((c, i) => (
                  <span key={i} className={`badge-risk ${c.toLowerCase()}`} style={{fontSize: '0.75rem', padding: '0.15rem 0.5rem'}}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Features Utilised</span>
              <span style={styles.metaVal}>{modelMeta.features?.length || 16} input features</span>
            </div>
          </div>

          <div style={styles.infoAlert}>
            <Info size={14} color="var(--primary)" />
            <span style={styles.infoText}>
              Feature importances are computed during model training using Gini impurity decrease.
            </span>
          </div>
        </div>

        {/* Feature Importance Plot */}
        <div className="glass-panel" style={{...styles.card, gridColumn: 'span 2'}}>
          <div style={styles.cardHeader}>
            <TrendingUp size={18} color="var(--accent)" />
            <h4 className="display-font" style={styles.cardTitle}>Global Feature Importance</h4>
          </div>
          
          <div style={{height: '240px', width: '100%', marginTop: '1rem'}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={getImportanceChartData()}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={9} label={{ value: 'Importance %', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-sm)'}}
                  itemStyle={{color: 'var(--text-primary)'}}
                  formatter={(v) => [`${v}%`, 'Importance Weight']}
                />
                <Bar dataKey="Importance" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={24}>
                  {getImportanceChartData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--accent)' : 'var(--primary)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Interactive Sensitivity Analysis */}
      <div className="glass-panel" style={styles.sensCard}>
        <div style={styles.sensHeader}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Sliders size={18} color="var(--primary)" />
            <h4 className="display-font" style={styles.cardTitle}>Live Risk Sensitivity Simulator</h4>
          </div>
          <span style={styles.sensHeaderSubtitle}>
            Simulate how changing single inputs dynamically alters delivery risk levels.
          </span>
        </div>

        <div style={styles.sensLayout}>
          {/* Controls */}
          <div style={styles.sensControls}>
            <div style={styles.field}>
              <label style={styles.label}>Select Feature to Modulate</label>
              <select
                value={sensFeature}
                onChange={(e) => {
                  setSensFeature(e.target.value);
                  // Setup appropriate defaults based on selected feature
                  if (['Cargo_Condition', 'Vehicle_Capacity'].includes(e.target.value)) {
                    setSensValue(0.8);
                  } else {
                    setSensValue(5.0);
                  }
                }}
                style={styles.select}
              >
                <option value="Disruption_Score">Disruption Score (Top Predictor)</option>
                <option value="Traffic_Level">Traffic Level</option>
                <option value="Driver_Fatigue">Driver Fatigue Level</option>
                <option value="Weather_Severity">Weather Severity</option>
                <option value="Cargo_Condition">Cargo Condition Score</option>
                <option value="Route_Risk">Route Risk Score</option>
              </select>
            </div>

            <div style={styles.field}>
              <div style={styles.fieldLabelRow}>
                <label style={styles.label}>Simulated Value</label>
                <span className="display-font" style={styles.simValText}>
                  {['Cargo_Condition', 'Vehicle_Capacity'].includes(sensFeature) ? sensValue.toFixed(2) : sensValue.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={['Cargo_Condition', 'Vehicle_Capacity'].includes(sensFeature) ? "1" : "10"}
                step={['Cargo_Condition', 'Vehicle_Capacity'].includes(sensFeature) ? "0.01" : "0.1"}
                value={sensValue}
                onChange={(e) => setSensValue(parseFloat(e.target.value))}
                style={styles.slider}
              />
            </div>
            
            <div style={styles.sensNote}>
              <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4}}>
                * All other features are held constant at representative baseline values (e.g. Weather Severity: 3.0, ETA Variation: 12.0 mins).
              </p>
            </div>
          </div>

          {/* Outputs */}
          <div style={styles.sensResultBox}>
            {sensLoading && !sensResult ? (
              <div style={styles.sensLoader}>
                <RefreshCw className="animate-spin" size={24} color="var(--primary)" />
              </div>
            ) : sensResult ? (
              <div style={styles.sensResultInner} className="animate-fade-in">
                <div style={styles.sensOutcomeRow}>
                  <div style={styles.sensOutcomeField}>
                    <span style={styles.outcomeLabel}>Resultant Risk</span>
                    <span className="display-font" style={{...styles.outcomeVal, color: getRiskColor(sensResult.risk_level)}}>
                      {sensResult.risk_level}
                    </span>
                  </div>
                  <div style={styles.sensOutcomeField}>
                    <span style={styles.outcomeLabel}>Confidence</span>
                    <span className="display-font" style={styles.outcomeConf}>
                      {Math.round(sensResult.confidence * 100)}%
                    </span>
                  </div>
                </div>

                {/* mini bar graph */}
                <div style={styles.probsList}>
                  {Object.entries(sensResult.probabilities).map(([c, p], idx) => (
                    <div key={idx} style={styles.probRow}>
                      <span style={styles.probLabel}>{c}</span>
                      <div style={styles.probBarTrack}>
                        <div 
                          style={{
                            ...styles.probBarFill,
                            width: `${p * 100}%`,
                            backgroundColor: getRiskColor(c)
                          }} 
                        />
                      </div>
                      <span style={styles.probPct}>{Math.round(p * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
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
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5rem 0',
  },
  errorCard: {
    padding: '2rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: '400px',
    margin: '2rem auto',
  },
  retryBtn: {
    marginTop: '1rem',
    padding: '0.5rem 1.5rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: 'var(--primary)',
    color: '#fff',
    cursor: 'pointer',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 2fr',
    gap: '2rem',
    alignItems: 'stretch',
  },
  card: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '0.75rem',
    marginBottom: '1rem',
  },
  cardTitle: {
    fontSize: '1rem',
    color: '#fff',
  },
  metaList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    flexGrow: 1,
  },
  metaItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
  },
  metaLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  metaVal: {
    fontSize: '0.85rem',
    color: '#fff',
    fontWeight: '600',
  },
  badgesRow: {
    display: 'flex',
    gap: '0.35rem',
  },
  infoAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    border: '1px solid rgba(99, 102, 241, 0.1)',
    marginTop: '1.5rem',
  },
  infoText: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  },
  sensCard: {
    padding: '2rem',
  },
  sensHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '1.25rem',
    marginBottom: '1.5rem',
  },
  sensHeaderSubtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  sensLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2.5rem',
    alignItems: 'center',
  },
  sensControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  select: {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
    cursor: 'pointer',
  },
  fieldLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  simValText: {
    fontSize: '1rem',
    color: 'var(--primary)',
  },
  slider: {
    width: '100%',
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '3px',
    outline: 'none',
    cursor: 'pointer',
  },
  sensNote: {
    marginTop: '0.5rem',
  },
  sensResultBox: {
    height: '180px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    border: '1px solid var(--border-color)',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sensLoader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensResultInner: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  sensOutcomeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sensOutcomeField: {
    display: 'flex',
    flexDirection: 'column',
  },
  outcomeLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  outcomeVal: {
    fontSize: '1.75rem',
    fontWeight: '800',
  },
  outcomeConf: {
    fontSize: '1.75rem',
    color: '#fff',
    fontWeight: '800',
    textAlign: 'right',
  },
  probsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
  },
  probRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  probLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    width: '60px',
  },
  probBarTrack: {
    flexGrow: 1,
    height: '6px',
    borderRadius: '3px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  probBarFill: {
    height: '100%',
    borderRadius: '3px',
  },
  probPct: {
    fontSize: '0.75rem',
    color: 'var(--text-primary)',
    fontWeight: '600',
    width: '35px',
    textAlign: 'right',
  },
};
