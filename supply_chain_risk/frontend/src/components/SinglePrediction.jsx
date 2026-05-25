import React, { useState } from 'react';
import { 
  Zap, 
  HelpCircle, 
  Play, 
  RefreshCw, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle,
  Truck,
  CloudLightning,
  Clock,
  Compass
} from 'lucide-react';
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
import { API_BASE } from '../config';

const PRESETS = {
  low: {
    Traffic_Level: 2.1,
    ETA_Variation: 2.0,
    Weather_Severity: 1.5,
    Loading_Time: 15.0,
    Route_Risk: 2.0,
    Delivery_Time_Deviation: -1.0,
    Disruption_Score: 1.2,
    Fuel_Rate: 8.5,
    Vehicle_Capacity: 0.65,
    Warehouse_ID: 'W001',
    Order_Status: 1.0, // Fulfilled
    Cargo_Condition: 0.95, // Near perfect
    Driver_Fatigue: 1.5
  },
  moderate: {
    Traffic_Level: 5.0,
    ETA_Variation: 10.0,
    Weather_Severity: 4.0,
    Loading_Time: 35.0,
    Route_Risk: 4.8,
    Delivery_Time_Deviation: 12.0,
    Disruption_Score: 4.5,
    Fuel_Rate: 11.2,
    Vehicle_Capacity: 0.80,
    Warehouse_ID: 'W002',
    Order_Status: 0.0, // Pending
    Cargo_Condition: 0.75,
    Driver_Fatigue: 4.2
  },
  high: {
    Traffic_Level: 8.5,
    ETA_Variation: 45.0,
    Weather_Severity: 8.0,
    Loading_Time: 75.0,
    Route_Risk: 8.5,
    Delivery_Time_Deviation: 55.0,
    Disruption_Score: 8.9,
    Fuel_Rate: 14.8,
    Vehicle_Capacity: 0.95,
    Warehouse_ID: 'W003',
    Order_Status: 0.0, // Pending
    Cargo_Condition: 0.40, // Poor condition
    Driver_Fatigue: 8.5
  }
};

export default function SinglePrediction({ token, onPredictionComplete, onLogout }) {
  const [formData, setFormData] = useState({
    Traffic_Level: 5.0,
    ETA_Variation: 15.0,
    Weather_Severity: 3.0,
    Loading_Time: 30.0,
    Route_Risk: 4.0,
    Delivery_Time_Deviation: 10.0,
    Disruption_Score: 4.0,
    Fuel_Rate: 10.5,
    Vehicle_Capacity: 0.8,
    Warehouse_ID: 'W001',
    Order_Status: 0.0,
    Cargo_Condition: 0.8,
    Driver_Fatigue: 3.5,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [featureImportances, setFeatureImportances] = useState(null);

  React.useEffect(() => {
    fetch(`${API_BASE}/api/v1/features`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (res.status === 401) {
          if (onLogout) onLogout();
          throw new Error('Unauthorized');
        }
        return res.json();
      })
      .then(data => {
        setFeatureImportances(data.importances);
      })
      .catch(err => console.error("Error loading importances", err));
  }, [token, onLogout]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    let parsedValue = value;
    
    if (type === 'number' || type === 'range') {
      parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) parsedValue = 0;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };

  const loadPreset = (key) => {
    setFormData(PRESETS[key]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/v1/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        if (response.status === 401) {
          if (onLogout) onLogout();
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to generate prediction.');
      }

      const data = await response.json();
      setResult(data);
      onPredictionComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data for class probabilities
  const getProbabilityChartData = () => {
    if (!result) return [];
    return Object.entries(result.probabilities).map(([key, val]) => ({
      name: key,
      Probability: Math.round(val * 100)
    })).sort((a, b) => b.Probability - a.Probability);
  };

  const getAllParametersAnalysis = () => {
    if (!result || !featureImportances) return [];
    
    const paramsList = [
      { key: 'Disruption_Score', label: 'Disruption Score', val: formData.Disruption_Score.toFixed(1), type: 'range' },
      { key: 'Traffic_Level', label: 'Traffic Level', val: formData.Traffic_Level.toFixed(1), type: 'range' },
      { key: 'Driver_Fatigue', label: 'Driver Fatigue Level', val: formData.Driver_Fatigue.toFixed(1), type: 'range' },
      { key: 'Delivery_Time_Deviation', label: 'Delivery Time Deviation', val: `${formData.Delivery_Time_Deviation} min`, type: 'number' },
      { key: 'Weather_Severity', label: 'Weather Severity', val: formData.Weather_Severity.toFixed(1), type: 'range' },
      { key: 'Loading_Time', label: 'Loading Time', val: `${formData.Loading_Time} min`, type: 'number' },
      { key: 'ETA_Variation', label: 'ETA Variation', val: `${formData.ETA_Variation} min`, type: 'number' },
      { key: 'Vehicle_Capacity', label: 'Vehicle Capacity Util.', val: `${Math.round(formData.Vehicle_Capacity * 100)}%`, type: 'range' },
      { key: 'Fuel_Rate', label: 'Fuel Rate', val: `${formData.Fuel_Rate} L/100km`, type: 'number' },
      { key: 'Route_Risk', label: 'Route Risk Score', val: formData.Route_Risk.toFixed(1), type: 'range' },
      { key: 'Warehouse_ID', label: 'Warehouse Origin', val: formData.Warehouse_ID, type: 'select' },
      { key: 'Order_Status', label: 'Fulfilment Status', val: formData.Order_Status === 1 ? 'Fulfilled (1.0)' : 'Pending (0.0)', type: 'select' },
      { key: 'Cargo_Condition', label: 'Cargo Condition', val: formData.Cargo_Condition.toFixed(2), type: 'range' }
    ];

    return paramsList.map(item => {
      let importanceVal = 0;
      
      if (item.key === 'Warehouse_ID') {
        const wKey = `Warehouse_ID_${formData.Warehouse_ID}`;
        importanceVal = featureImportances[wKey] || 0.0;
      } else {
        importanceVal = featureImportances[item.key] || 0.0;
      }

      let impactText = 'Unused';
      let impactColor = 'var(--text-muted)';
      
      if (importanceVal > 0.1) {
        impactText = 'Critical';
        impactColor = 'var(--color-high)';
      } else if (importanceVal > 0.02) {
        impactText = 'Medium';
        impactColor = 'var(--color-moderate)';
      } else if (importanceVal > 0.0) {
        impactText = 'Low';
        impactColor = 'var(--color-low)';
      }

      return {
        ...item,
        importance: importanceVal,
        impactText,
        impactColor
      };
    });
  };

  const getRiskColor = (risk) => {
    if (risk === 'High') return 'var(--color-high)';
    if (risk === 'Moderate') return 'var(--color-moderate)';
    return 'var(--color-low)';
  };

  return (
    <div style={styles.container}>
      {/* Configuration Form Card */}
      <div className="glass-panel" style={styles.formCard}>
        <div style={styles.sectionHeader}>
          <h3 className="display-font" style={styles.sectionTitle}>Shipment Parameters</h3>
          <div style={styles.presets}>
            <span style={styles.presetLabel}>Presets:</span>
            <button type="button" onClick={() => loadPreset('low')} style={{...styles.presetBtn, borderColor: 'var(--color-low)'}}>Low Risk</button>
            <button type="button" onClick={() => loadPreset('moderate')} style={{...styles.presetBtn, borderColor: 'var(--color-moderate)'}}>Moderate</button>
            <button type="button" onClick={() => loadPreset('high')} style={{...styles.presetBtn, borderColor: 'var(--color-high)'}}>High Risk</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          
          {/* Group 1: Journey & Environment */}
          <div style={styles.formGroupSection}>
            <h4 style={styles.groupHeading}>
              <CloudLightning size={16} color="var(--primary)" />
              Journey & Weather
            </h4>
            <div style={styles.grid2Col}>
              
              <div style={styles.field}>
                <div style={styles.fieldLabelRow}>
                  <label style={styles.label}>Traffic Level (0-10)</label>
                  <span style={styles.valDisplay}>{formData.Traffic_Level.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  name="Traffic_Level"
                  min="0"
                  max="10"
                  step="0.1"
                  value={formData.Traffic_Level}
                  onChange={handleInputChange}
                  style={styles.slider}
                />
              </div>

              <div style={styles.field}>
                <div style={styles.fieldLabelRow}>
                  <label style={styles.label}>Weather Severity (0-10)</label>
                  <span style={styles.valDisplay}>{formData.Weather_Severity.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  name="Weather_Severity"
                  min="0"
                  max="10"
                  step="0.1"
                  value={formData.Weather_Severity}
                  onChange={handleInputChange}
                  style={styles.slider}
                />
              </div>

              <div style={styles.field}>
                <div style={styles.fieldLabelRow}>
                  <label style={styles.label}>Route Risk (0-10)</label>
                  <span style={styles.valDisplay}>{formData.Route_Risk.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  name="Route_Risk"
                  min="0"
                  max="10"
                  step="0.1"
                  value={formData.Route_Risk}
                  onChange={handleInputChange}
                  style={styles.slider}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>ETA Variation (minutes)</label>
                <input
                  type="number"
                  name="ETA_Variation"
                  value={formData.ETA_Variation}
                  onChange={handleInputChange}
                  style={styles.inputNumber}
                  required
                />
              </div>

            </div>
          </div>

          {/* Group 2: Dispatch & Logistics */}
          <div style={styles.formGroupSection}>
            <h4 style={styles.groupHeading}>
              <Truck size={16} color="var(--primary)" />
              Shipment & Cargo
            </h4>
            <div style={styles.grid2Col}>
              
              <div style={styles.field}>
                <label style={styles.label}>Warehouse Origin</label>
                <select
                  name="Warehouse_ID"
                  value={formData.Warehouse_ID}
                  onChange={handleInputChange}
                  style={styles.select}
                >
                  <option value="W001">W001 (Main Hub)</option>
                  <option value="W002">W002 (North)</option>
                  <option value="W003">W003 (South East)</option>
                  <option value="W004">W004 (West Coast)</option>
                  <option value="W005">W005 (Central)</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Fulfilment Status</label>
                <select
                  name="Order_Status"
                  value={formData.Order_Status}
                  onChange={handleInputChange}
                  style={styles.select}
                >
                  <option value={0.0}>Pending (0.0)</option>
                  <option value={1.0}>Fulfilled (1.0)</option>
                </select>
              </div>

              <div style={styles.field}>
                <div style={styles.fieldLabelRow}>
                  <label style={styles.label}>Cargo Condition (0=Poor, 1=Good)</label>
                  <span style={styles.valDisplay}>{formData.Cargo_Condition.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  name="Cargo_Condition"
                  min="0"
                  max="1"
                  step="0.01"
                  value={formData.Cargo_Condition}
                  onChange={handleInputChange}
                  style={styles.slider}
                />
              </div>

              <div style={styles.field}>
                <div style={styles.fieldLabelRow}>
                  <label style={styles.label}>Vehicle Capacity Utilisation</label>
                  <span style={styles.valDisplay}>{Math.round(formData.Vehicle_Capacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  name="Vehicle_Capacity"
                  min="0"
                  max="1"
                  step="0.01"
                  value={formData.Vehicle_Capacity}
                  onChange={handleInputChange}
                  style={styles.slider}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Loading Time (minutes)</label>
                <input
                  type="number"
                  name="Loading_Time"
                  min="0"
                  value={formData.Loading_Time}
                  onChange={handleInputChange}
                  style={styles.inputNumber}
                  required
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Fuel Rate (L/100km)</label>
                <input
                  type="number"
                  name="Fuel_Rate"
                  min="0"
                  step="0.1"
                  value={formData.Fuel_Rate}
                  onChange={handleInputChange}
                  style={styles.inputNumber}
                  required
                />
              </div>

              <div style={styles.field} style={{gridColumn: 'span 2'}}>
                <label style={styles.label}>Delivery Time Deviation (minutes)</label>
                <input
                  type="number"
                  name="Delivery_Time_Deviation"
                  value={formData.Delivery_Time_Deviation}
                  onChange={handleInputChange}
                  style={styles.inputNumber}
                  required
                />
              </div>

            </div>
          </div>

          {/* Group 3: Drivers & Disruption (Critical Predictors) */}
          <div style={{...styles.formGroupSection, border: '1px solid rgba(99, 102, 241, 0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.02)'}}>
            <h4 style={{...styles.groupHeading, color: 'var(--primary)'}}>
              <Zap size={16} color="var(--primary)" />
              Critical Risk Drivers
            </h4>
            <div style={styles.grid2Col}>
              
              <div style={styles.field} style={{gridColumn: 'span 2'}}>
                <div style={styles.fieldLabelRow}>
                  <label style={{...styles.label, fontWeight: '700', color: 'var(--text-primary)'}}>
                    Disruption Score (0-10) — <em>Top Predictor (67% importance)</em>
                  </label>
                  <span style={{...styles.valDisplay, color: 'var(--primary)', fontWeight: 'bold'}}>{formData.Disruption_Score.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  name="Disruption_Score"
                  min="0"
                  max="10"
                  step="0.1"
                  value={formData.Disruption_Score}
                  onChange={handleInputChange}
                  style={{...styles.slider, accentColor: 'var(--primary)'}}
                />
              </div>

              <div style={styles.field} style={{gridColumn: 'span 2'}}>
                <div style={styles.fieldLabelRow}>
                  <label style={styles.label}>Driver Fatigue Level (0-10)</label>
                  <span style={styles.valDisplay}>{formData.Driver_Fatigue.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  name="Driver_Fatigue"
                  min="0"
                  max="10"
                  step="0.1"
                  value={formData.Driver_Fatigue}
                  onChange={handleInputChange}
                  style={styles.slider}
                />
              </div>

            </div>
          </div>

          {error && (
            <div style={styles.error} className="animate-fade-in">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={styles.submitBtn}
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin" size={18} style={{marginRight: '0.5rem'}} />
                Calculating Risks...
              </>
            ) : (
              <>
                <Play size={18} style={{marginRight: '0.5rem'}} />
                Run Risk Analysis
              </>
            )}
          </button>
        </form>
      </div>

      {/* Results Card */}
      <div className="glass-panel" style={styles.resultsCard}>
        {!result ? (
          <div style={styles.noResult}>
            <Compass size={64} color="var(--text-muted)" style={{marginBottom: '1rem', opacity: 0.5}} />
            <h3 className="display-font" style={{color: 'var(--text-secondary)', marginBottom: '0.5rem'}}>Awaiting Parameters</h3>
            <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '280px'}}>
              Adjust shipment features and click "Run Risk Analysis" to evaluate delivery probabilities.
            </p>
          </div>
        ) : (
          <div className="animate-fade-in" style={styles.resultContainer}>
            <div style={styles.resultHeader}>
              <h3 className="display-font" style={styles.resultTitle}>Risk Analysis Report</h3>
              <span style={styles.timestamp}>Generated just now</span>
            </div>

            {/* Risk Category Badge */}
            <div style={{
              ...styles.riskIndicator,
              backgroundColor: result.risk_level === 'High' ? 'var(--bg-high)' : result.risk_level === 'Moderate' ? 'var(--bg-moderate)' : 'var(--bg-low)',
              borderColor: getRiskColor(result.risk_level),
            }}>
              <div style={styles.indicatorLeft}>
                <span style={styles.indicatorLabel}>Predicted Risk Level</span>
                <span className="display-font" style={{...styles.indicatorVal, color: getRiskColor(result.risk_level)}}>
                  {result.risk_level}
                </span>
              </div>
              <div style={styles.indicatorRight}>
                <span style={styles.indicatorLabel}>Confidence</span>
                <span className="display-font" style={styles.confidencePct}>
                  {Math.round(result.confidence * 100)}%
                </span>
              </div>
            </div>

            {/* Probability breakdown */}
            <div style={styles.cardSection}>
              <h4 style={styles.sectionSubtitle}>Class Probabilities</h4>
              <div style={{height: '180px', width: '100%', marginTop: '1rem'}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getProbabilityChartData()}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => `${v}%`} />
                    <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={11} width={80} />
                    <Tooltip 
                      contentStyle={{backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-sm)'}}
                      itemStyle={{color: 'var(--text-primary)'}}
                      formatter={(v) => [`${v}%`, 'Probability']}
                    />
                    <Bar dataKey="Probability" radius={[0, 4, 4, 0]} barSize={18}>
                      {getProbabilityChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getRiskColor(entry.name)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Contributing factors */}
            <div style={styles.cardSection}>
              <h4 style={styles.sectionSubtitle}>Top Contributing Factors</h4>
              <div style={styles.factorsList}>
                {result.top_risk_factors.map((factor, idx) => {
                  const featureName = factor.feature.replace(/_/g, ' ');
                  return (
                    <div key={idx} style={styles.factorItem}>
                      <div style={styles.factorDetails}>
                        <span style={styles.factorName}>{featureName}</span>
                        <span style={styles.factorValue}>Value: {factor.value.toFixed(1)}</span>
                      </div>
                      <div style={styles.factorBarContainer}>
                        <div 
                          style={{
                            ...styles.factorBar, 
                            width: `${factor.importance * 100}%`,
                            backgroundColor: idx === 0 ? 'var(--primary)' : 'var(--accent)'
                          }} 
                        />
                        <span style={styles.factorWeight}>wt: {(factor.importance * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed Parameters Analysis Table */}
            <div style={styles.cardSection}>
              <details style={styles.detailsCollapsible}>
                <summary className="display-font" style={styles.detailsSummary}>
                  <span>Show All Parameters Influence ({getAllParametersAnalysis().length} items)</span>
                </summary>
                <div style={styles.detailsTableContainer}>
                  <table style={styles.detailsTable}>
                    <thead>
                      <tr>
                        <th style={styles.detailsTh}>Parameter</th>
                        <th style={styles.detailsTh}>Your Input</th>
                        <th style={styles.detailsTh}>Model Weight</th>
                        <th style={styles.detailsTh}>Impact Class</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getAllParametersAnalysis().map((param, idx) => (
                        <tr key={idx} style={styles.detailsTr}>
                          <td style={styles.detailsTd}>{param.label}</td>
                          <td style={{...styles.detailsTd, fontWeight: '600'}}>{param.val}</td>
                          <td style={styles.detailsTd}>{(param.importance * 100).toFixed(2)}%</td>
                          <td style={{...styles.detailsTd, color: param.impactColor, fontWeight: '700'}}>
                            {param.impactText}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>

            {/* Recommendation block */}
            <div style={{
              ...styles.recommendation,
              borderColor: result.risk_level === 'High' ? 'var(--border-high)' : result.risk_level === 'Moderate' ? 'var(--border-moderate)' : 'var(--border-low)'
            }}>
              <div style={styles.recHeader}>
                {result.risk_level === 'High' ? (
                  <AlertTriangle size={18} color="var(--color-high)" />
                ) : result.risk_level === 'Moderate' ? (
                  <AlertTriangle size={18} color="var(--color-moderate)" />
                ) : (
                  <CheckCircle size={18} color="var(--color-low)" />
                )}
                <span className="display-font" style={styles.recTitle}>
                  {result.risk_level === 'High' ? 'Mitigation Required' : result.risk_level === 'Moderate' ? 'Caution Advised' : 'Optimal Dispatch'}
                </span>
              </div>
              <p style={styles.recText}>
                {result.risk_level === 'High' ? (
                  `Critical warning. Disruption score of ${formData.Disruption_Score} is heavily impacting delivery reliability. Consider delaying shipment, splitting the order, or routing via low-risk warehouses.`
                ) : result.risk_level === 'Moderate' ? (
                  `Moderate risks detected. Primarily driven by weather severity (${formData.Weather_Severity}) or traffic (${formData.Traffic_Level}). Maintain constant GPS tracking and alerts.`
                ) : (
                  `Conditions indicate high confidence of on-time delivery. Warehouse ${formData.Warehouse_ID} and cargo status are within nominal parameters.`
                )}
              </p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '2rem',
    alignItems: 'start',
  },
  formCard: {
    padding: '2rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '1rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    color: '#fff',
  },
  presets: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  presetLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  presetBtn: {
    padding: '0.3rem 0.6rem',
    borderRadius: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.06)'
    }
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formGroupSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    paddingBottom: '1.25rem',
  },
  groupHeading: {
    fontSize: '0.9rem',
    color: '#fff',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  grid2Col: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.25rem 1.5rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  fieldLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  valDisplay: {
    fontSize: '0.8rem',
    color: 'var(--text-primary)',
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '3px',
    outline: 'none',
    cursor: 'pointer',
  },
  inputNumber: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
    cursor: 'pointer',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.9rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--primary)',
    border: 'none',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '1rem',
    transition: 'background-color var(--transition-fast)',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-high)',
    border: '1px solid var(--border-high)',
    color: 'var(--color-high)',
    fontSize: '0.85rem',
    fontWeight: '500',
  },
  resultsCard: {
    padding: '2rem',
    minHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: '2rem',
  },
  noResult: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 1rem',
  },
  resultContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '1rem',
  },
  resultTitle: {
    fontSize: '1.2rem',
    color: '#fff',
  },
  timestamp: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  riskIndicator: {
    display: 'flex',
    padding: '1.25rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid transparent',
  },
  indicatorLeft: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  indicatorLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.25rem',
  },
  indicatorVal: {
    fontSize: '2rem',
    fontWeight: '800',
  },
  indicatorRight: {
    borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
    paddingLeft: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  confidencePct: {
    fontSize: '2rem',
    color: '#fff',
    fontWeight: '800',
  },
  cardSection: {
    display: 'flex',
    flexDirection: 'column',
  },
  sectionSubtitle: {
    fontSize: '0.9rem',
    color: '#fff',
    fontWeight: '600',
    borderLeft: '3px solid var(--primary)',
    paddingLeft: '0.5rem',
  },
  factorsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
    marginTop: '1rem',
  },
  factorItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    padding: '0.6rem 0.85rem',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    border: '1px solid var(--border-color)',
  },
  factorDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  factorName: {
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  factorValue: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  factorBarContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  factorBar: {
    height: '6px',
    borderRadius: '3px',
  },
  factorWeight: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    marginLeft: 'auto',
    whiteSpace: 'nowrap',
  },
  recommendation: {
    marginTop: '0.5rem',
    padding: '1rem 1.25rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderLeft: '4px solid transparent',
  },
  recHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  recTitle: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#fff',
  },
  recText: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  detailsCollapsible: {
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    overflow: 'hidden',
    marginTop: '0.5rem',
  },
  detailsSummary: {
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: '600',
    outline: 'none',
    userSelect: 'none',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  detailsTableContainer: {
    maxHeight: '260px',
    overflowY: 'auto',
    borderTop: '1px solid var(--border-color)',
  },
  detailsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  detailsTh: {
    padding: '0.5rem 0.75rem',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    fontSize: '0.7rem',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailsTr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.015)',
  },
  detailsTd: {
    padding: '0.5rem 0.75rem',
    fontSize: '0.75rem',
    color: 'var(--text-primary)',
  },
};
