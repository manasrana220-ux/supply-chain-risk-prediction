import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Play, 
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip 
} from 'recharts';
import { API_BASE } from '../config';

const SAMPLE_BATCH_DATA = [
  { Traffic_Level: 7.2, ETA_Variation: 15.0, Weather_Severity: 4.5, Loading_Time: 45.0, Route_Risk: 6.0, Delivery_Time_Deviation: 30.0, Disruption_Score: 8.1, Fuel_Rate: 12.5, Vehicle_Capacity: 0.85, Warehouse_ID: 'W003', Order_Status: 0.0, Cargo_Condition: 0.9, Driver_Fatigue: 6.5 },
  { Traffic_Level: 1.5, ETA_Variation: 1.0, Weather_Severity: 1.0, Loading_Time: 10.0, Route_Risk: 1.2, Delivery_Time_Deviation: 0.0, Disruption_Score: 1.0, Fuel_Rate: 8.0, Vehicle_Capacity: 0.60, Warehouse_ID: 'W001', Order_Status: 1.0, Cargo_Condition: 0.98, Driver_Fatigue: 1.0 },
  { Traffic_Level: 5.2, ETA_Variation: 8.0, Weather_Severity: 3.5, Loading_Time: 25.0, Route_Risk: 4.0, Delivery_Time_Deviation: 5.0, Disruption_Score: 4.8, Fuel_Rate: 10.0, Vehicle_Capacity: 0.78, Warehouse_ID: 'W002', Order_Status: 0.0, Cargo_Condition: 0.80, Driver_Fatigue: 3.5 },
  { Traffic_Level: 9.0, ETA_Variation: 50.0, Weather_Severity: 7.5, Loading_Time: 80.0, Route_Risk: 8.0, Delivery_Time_Deviation: 60.0, Disruption_Score: 9.2, Fuel_Rate: 15.0, Vehicle_Capacity: 0.92, Warehouse_ID: 'W005', Order_Status: 0.0, Cargo_Condition: 0.35, Driver_Fatigue: 8.0 },
  { Traffic_Level: 3.0, ETA_Variation: 4.0, Weather_Severity: 2.0, Loading_Time: 20.0, Route_Risk: 2.5, Delivery_Time_Deviation: 2.0, Disruption_Score: 2.5, Fuel_Rate: 9.0, Vehicle_Capacity: 0.70, Warehouse_ID: 'W004', Order_Status: 1.0, Cargo_Condition: 0.90, Driver_Fatigue: 2.0 },
  { Traffic_Level: 8.0, ETA_Variation: 25.0, Weather_Severity: 6.0, Loading_Time: 60.0, Route_Risk: 7.0, Delivery_Time_Deviation: 35.0, Disruption_Score: 7.8, Fuel_Rate: 13.5, Vehicle_Capacity: 0.88, Warehouse_ID: 'W003', Order_Status: 0.0, Cargo_Condition: 0.60, Driver_Fatigue: 7.0 },
];

export default function BatchPrediction({ token, onPredictionComplete, onLogout }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [sortField, setSortField] = useState('confidence');
  const [sortAsc, setSortAsc] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          throw new Error("No valid data rows found in CSV.");
        }
        setRecords(parsed);
        setResults(null);
      } catch (err) {
        setError(`CSV Parse Error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const expected = [
      "Traffic_Level", "ETA_Variation", "Weather_Severity", "Loading_Time",
      "Route_Risk", "Delivery_Time_Deviation", "Disruption_Score", "Fuel_Rate",
      "Vehicle_Capacity", "Warehouse_ID", "Order_Status", "Cargo_Condition",
      "Driver_Fatigue"
    ];

    // Check headers mapping (loose checking)
    const headerIndices = {};
    expected.forEach(field => {
      const idx = headers.findIndex(h => h.toLowerCase() === field.toLowerCase());
      if (idx !== -1) {
        headerIndices[field] = idx;
      }
    });

    // Make sure we have the critical fields
    if (!headerIndices["Disruption_Score"] && !headerIndices["Warehouse_ID"]) {
      throw new Error(`Invalid headers. Must include at least Disruption_Score, Warehouse_ID, etc.`);
    }

    const parsedData = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < headers.length) continue;

      const record = {};
      let rowValid = true;

      expected.forEach(field => {
        const idx = headerIndices[field];
        if (idx !== undefined && cols[idx] !== undefined) {
          if (field === "Warehouse_ID") {
            record[field] = cols[idx];
          } else {
            const val = parseFloat(cols[idx]);
            record[field] = isNaN(val) ? 0.0 : val;
          }
        } else {
          // Fill fallback defaults
          if (field === "Warehouse_ID") record[field] = "W001";
          else record[field] = 0.0;
        }
      });

      if (rowValid) {
        parsedData.push(record);
      }
    }
    return parsedData;
  };

  const loadSampleData = () => {
    setRecords(SAMPLE_BATCH_DATA);
    setResults(null);
    setError('');
  };

  const processBatch = async () => {
    if (records.length === 0) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/v1/predict/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ records })
      });

      if (!response.ok) {
        if (response.status === 401) {
          if (onLogout) onLogout();
          return;
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed processing batch predictions.');
      }

      const data = await response.json();
      setResults(data);
      onPredictionComplete(records.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!results) return;
    
    // Create CSV content
    const headers = [
      "Row_ID", "Warehouse_ID", "Disruption_Score", "Traffic_Level", 
      "Cargo_Condition", "Predicted_Risk", "Confidence"
    ];
    
    const rows = results.predictions.map((p, idx) => {
      const orig = records[idx] || {};
      return [
        idx + 1,
        orig.Warehouse_ID || '',
        orig.Disruption_Score || 0,
        orig.Traffic_Level || 0,
        orig.Cargo_Condition || 0,
        p.risk_level,
        p.confidence
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `supply_chain_risk_predictions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Process data for charts
  const getChartData = () => {
    if (!results) return [];
    return Object.entries(results.summary).map(([key, val]) => ({
      name: key,
      value: val
    }));
  };

  const COLORS = {
    High: 'var(--color-high)',
    Moderate: 'var(--color-moderate)',
    Low: 'var(--color-low)'
  };

  // Filter and sort predictions
  const getFilteredPredictions = () => {
    if (!results) return [];
    
    let list = results.predictions.map((p, idx) => ({
      ...p,
      originalIndex: idx,
      originalRecord: records[idx]
    }));

    if (filterLevel !== 'ALL') {
      list = list.filter(p => p.risk_level === filterLevel);
    }

    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      // If original features sorting
      if (sortField === 'Disruption_Score' || sortField === 'Warehouse_ID') {
        aVal = a.originalRecord?.[sortField] ?? 0;
        bVal = b.originalRecord?.[sortField] ?? 0;
      }

      if (typeof aVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });

    return list;
  };

  return (
    <div style={styles.container}>
      {/* File upload workspace */}
      <div className="glass-panel" style={styles.uploadCard}>
        <h3 className="display-font" style={styles.cardTitle}>Source Data Upload</h3>
        <p style={styles.cardDesc}>
          Upload a batch CSV file of up to 500 records to calculate delivery risks.
        </p>

        <div 
          style={styles.dropZone}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={36} color="var(--primary)" style={{marginBottom: '1rem'}} />
          <span style={styles.dropText}>Click to upload CSV shipment records</span>
          <span style={styles.dropSub}>Must include fields such as Disruption_Score, Traffic_Level</span>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            style={{display: 'none'}}
          />
        </div>

        <div style={styles.actions}>
          <button 
            type="button" 
            onClick={loadSampleData} 
            style={styles.sampleBtn}
          >
            <FileSpreadsheet size={16} />
            Load Sample Dataset
          </button>
          
          <button
            type="button"
            onClick={processBatch}
            disabled={records.length === 0 || loading}
            style={{
              ...styles.processBtn,
              opacity: (records.length === 0 || loading) ? 0.6 : 1,
              cursor: (records.length === 0 || loading) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin" size={16} style={{marginRight: '0.5rem'}} />
                Processing...
              </>
            ) : (
              <>
                <Play size={16} style={{marginRight: '0.5rem'}} />
                Analyze {records.length} Shipments
              </>
            )}
          </button>
        </div>

        {records.length > 0 && !results && (
          <div style={styles.previewInfo} className="animate-fade-in">
            <CheckCircle2 size={16} color="var(--color-low)" />
            <span>Staged <strong>{records.length} records</strong>. Ready for processing.</span>
          </div>
        )}

        {error && (
          <div style={styles.error} className="animate-fade-in">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Results details */}
      {results && (
        <div style={styles.resultsWrapper} className="animate-fade-in">
          {/* Summary Cards */}
          <div style={styles.summaryGrid}>
            <div className="glass-panel" style={styles.statCard}>
              <span style={styles.statLabel}>Total Processed</span>
              <span className="display-font" style={styles.statValue}>{results.total}</span>
            </div>
            <div className="glass-panel" style={{...styles.statCard, borderLeft: '4px solid var(--color-high)'}}>
              <span style={styles.statLabel}>High Risk Warnings</span>
              <span className="display-font" style={{...styles.statValue, color: 'var(--color-high)'}}>
                {results.summary.High || 0}
              </span>
            </div>
            <div className="glass-panel" style={{...styles.statCard, borderLeft: '4px solid var(--color-moderate)'}}>
              <span style={styles.statLabel}>Moderate Risks</span>
              <span className="display-font" style={{...styles.statValue, color: 'var(--color-moderate)'}}>
                {results.summary.Moderate || 0}
              </span>
            </div>
            <div className="glass-panel" style={{...styles.statCard, borderLeft: '4px solid var(--color-low)'}}>
              <span style={styles.statLabel}>Nominal / Low Risk</span>
              <span className="display-font" style={{...styles.statValue, color: 'var(--color-low)'}}>
                {results.summary.Low || 0}
              </span>
            </div>
          </div>

          <div style={styles.detailsGrid}>
            {/* Chart */}
            <div className="glass-panel" style={styles.chartPanel}>
              <h4 className="display-font" style={styles.panelTitle}>Risk Distribution</h4>
              <div style={{height: '220px', width: '100%', marginTop: '1.5rem'}}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getChartData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {getChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name] || 'var(--primary)'} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-sm)'}}
                      itemStyle={{color: 'var(--text-primary)'}}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* List and tools */}
            <div className="glass-panel" style={styles.tablePanel}>
              <div style={styles.tableHeader}>
                <h4 className="display-font" style={styles.panelTitle}>Calculated Shipments</h4>
                <div style={styles.tableFilters}>
                  <div style={styles.filterGroup}>
                    <Filter size={14} color="var(--text-muted)" />
                    <select 
                      value={filterLevel} 
                      onChange={(e) => setFilterLevel(e.target.value)}
                      style={styles.tableSelect}
                    >
                      <option value="ALL">All Risks</option>
                      <option value="High">High Risk Only</option>
                      <option value="Moderate">Moderate Only</option>
                      <option value="Low">Low Risk Only</option>
                    </select>
                  </div>
                  <button onClick={handleExport} style={styles.exportBtn}>
                    <Download size={14} />
                    Export CSV
                  </button>
                </div>
              </div>

              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Row</th>
                      <th style={{...styles.th, cursor: 'pointer'}} onClick={() => handleSort('Warehouse_ID')}>Warehouse</th>
                      <th style={{...styles.th, cursor: 'pointer'}} onClick={() => handleSort('Disruption_Score')}>Disruption</th>
                      <th style={{...styles.th, cursor: 'pointer'}} onClick={() => handleSort('risk_level')}>Risk Category</th>
                      <th style={{...styles.th, cursor: 'pointer'}} onClick={() => handleSort('confidence')}>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredPredictions().map((p, idx) => {
                      const riskClass = p.risk_level.toLowerCase();
                      return (
                        <tr key={idx} style={styles.tr}>
                          <td style={styles.td}>{p.originalIndex + 1}</td>
                          <td style={styles.td}>{p.originalRecord?.Warehouse_ID}</td>
                          <td style={styles.td}>{p.originalRecord?.Disruption_Score?.toFixed(1)}</td>
                          <td style={styles.td}>
                            <span className={`badge-risk ${riskClass}`}>
                              {p.risk_level}
                            </span>
                          </td>
                          <td style={styles.td}>{Math.round(p.confidence * 100)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  uploadCard: {
    padding: '2rem',
  },
  cardTitle: {
    fontSize: '1.25rem',
    color: '#fff',
    marginBottom: '0.25rem',
  },
  cardDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginBottom: '1.5rem',
  },
  dropZone: {
    border: '2px dashed var(--border-color)',
    borderRadius: 'var(--radius-md)',
    padding: '3rem 2rem',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    transition: 'border-color var(--transition-fast), background-color var(--transition-fast)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    ':hover': {
      borderColor: 'var(--primary)',
      backgroundColor: 'rgba(99, 102, 241, 0.02)'
    }
  },
  dropText: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '0.25rem',
  },
  dropSub: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '1.5rem',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  sampleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'background-color var(--transition-fast)',
  },
  processBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--primary)',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'background-color var(--transition-fast)',
  },
  previewInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-low)',
    border: '1px solid var(--border-low)',
    marginTop: '1rem',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
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
    marginTop: '1rem',
  },
  resultsWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.25rem',
  },
  statCard: {
    padding: '1.25rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: '700',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    gap: '2rem',
    alignItems: 'start',
  },
  chartPanel: {
    padding: '1.5rem',
  },
  panelTitle: {
    fontSize: '1.1rem',
    color: '#fff',
  },
  tablePanel: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  tableFilters: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    padding: '0.4rem 0.6rem',
  },
  tableSelect: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
    cursor: 'pointer',
  },
  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.45rem 0.85rem',
    borderRadius: '4px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
    transition: 'background-color var(--transition-fast)',
  },
  tableContainer: {
    overflowX: 'auto',
    maxHeight: '350px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    fontSize: '0.8rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
  },
  td: {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
  },
};
