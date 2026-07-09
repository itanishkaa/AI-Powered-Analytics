import { useCallback, useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { parseCSV } from '../../engine/csvParser';
import { generateKPIs } from '../../engine/kpiEngine';
import { generateInsights } from '../../engine/insightsEngine';
import type { ParsedDataset, ColumnSchema } from '../../types';

function TypeBadge({ type }: { type: ColumnSchema['type'] }) {
    return <span className={`type-badge ${type}`}>{type}</span>;
}

function QualityBar({ quality }: { quality: number }) {
    const level = quality >= 80 ? 'high' : quality >= 50 ? 'medium' : 'low';
    return (
        <div className="quality-bar-container">
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', minWidth: 100 }}>
                Data Quality
            </span>
            <div className="quality-bar">
                <div className={`quality-bar-fill ${level}`} style={{ width: `${quality}%` }} />
            </div>
            <span style={{ fontWeight: 700, minWidth: 40, textAlign: 'right' }}>{quality}%</span>
        </div>
    );
}

export function UploadPage() {
    const { dispatch } = useStore();
    const [dragOver, setDragOver] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [preview, setPreview] = useState<ParsedDataset | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processFile = useCallback(async (file: File) => {
        if (!file.name.endsWith('.csv')) {
            setError('Please upload a CSV file.');
            return;
        }
        if (file.size > 100 * 1024 * 1024) {
            setError('File exceeds 100MB limit.');
            return;
        }

        setError(null);
        setProcessing(true);
        try {
            const dataset = await parseCSV(file);
            setPreview(dataset);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to parse CSV file.');
        } finally {
            setProcessing(false);
        }
    }, []);

    const handleConfirm = useCallback(() => {
        if (!preview) return;
        dispatch({ type: 'SET_LOADING', isLoading: true, message: 'Generating KPIs...' });
        dispatch({ type: 'SET_DATASET', dataset: preview });

        setTimeout(() => {
            const kpis = generateKPIs(preview);
            dispatch({ type: 'SET_KPIS', kpis });

            dispatch({ type: 'SET_LOADING', isLoading: true, message: 'Analyzing data for insights...' });
            setTimeout(() => {
                const insights = generateInsights(preview);
                dispatch({ type: 'SET_INSIGHTS', insights });
                dispatch({ type: 'SET_LOADING', isLoading: false });
            }, 500);
        }, 300);
    }, [preview, dispatch]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }, [processFile]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    }, [processFile]);

    if (processing) {
        return (
            <div className="upload-page">
                <div className="processing-overlay">
                    <div className="processing-spinner" />
                    <div className="processing-text">Analyzing your data...</div>
                </div>
            </div>
        );
    }

    if (preview) {
        return (
            <div className="upload-page" style={{ alignItems: 'flex-start', paddingTop: '2rem' }}>
                <div style={{ maxWidth: 900, width: '100%' }}>
                    <div className="schema-preview">
                        <h2 className="schema-title">
                            <FileSpreadsheet size={22} /> Schema Preview — {preview.fileName}
                        </h2>

                        <div className="quality-grid">
                            <div className="quality-stat">
                                <div className="label">Rows</div>
                                <div className="value">{preview.schema.rowCount.toLocaleString()}</div>
                            </div>
                            <div className="quality-stat">
                                <div className="label">Columns</div>
                                <div className="value">{preview.schema.columns.length}</div>
                            </div>
                            <div className="quality-stat">
                                <div className="label">Duplicates</div>
                                <div className={`value ${preview.schema.duplicateRowCount === 0 ? 'good' : 'warn'}`}>
                                    {preview.schema.duplicateRowCount}
                                </div>
                            </div>
                            <div className="quality-stat">
                                <div className="label">Missing Cells</div>
                                <div className={`value ${preview.schema.totalMissing === 0 ? 'good' : 'warn'}`}>
                                    {preview.schema.totalMissing.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <QualityBar quality={preview.schema.overallQuality} />

                        <table className="schema-table" style={{ marginTop: '1.5rem' }}>
                            <thead>
                                <tr>
                                    <th>Column</th>
                                    <th>Type</th>
                                    <th>Unique</th>
                                    <th>Missing</th>
                                    <th>Sample Values</th>
                                    <th>Issues</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.schema.columns.map(col => (
                                    <tr key={col.name}>
                                        <td style={{ fontWeight: 600 }}>{col.name}</td>
                                        <td><TypeBadge type={col.type} /></td>
                                        <td>{col.uniqueCount}</td>
                                        <td>
                                            <span style={{ color: col.missingCount > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                                                {col.missingPercent.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {col.sampleValues.join(', ')}
                                        </td>
                                        <td>
                                            {col.errors.length > 0 ? (
                                                <span style={{ color: 'var(--danger)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <AlertCircle size={14} /> {col.errors[0]}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--success)' }}><CheckCircle2 size={14} /></span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="confirm-actions">
                            <button className="btn" onClick={() => setPreview(null)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleConfirm}>
                                <CheckCircle2 size={16} /> Confirm & Analyze
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="upload-page">
            <div className="upload-container">
                <h1 className="upload-hero-title">AI-Powered Analytics</h1>
                <p className="upload-hero-sub">
                    Upload your CSV file and let AI automatically generate KPIs, discover insights, and answer your questions.
                </p>

                <div
                    className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="upload-icon"><Upload /></div>
                    <div className="upload-text">
                        Drag & drop your CSV file or <span className="upload-text-accent">browse</span>
                    </div>
                    <div className="upload-text-sub">Supports UTF-8 CSV files up to 100MB</div>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />

                {error && (
                    <div style={{ marginTop: '1rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                        <AlertCircle size={18} /> {error}
                    </div>
                )}
            </div>
        </div>
    );
}
