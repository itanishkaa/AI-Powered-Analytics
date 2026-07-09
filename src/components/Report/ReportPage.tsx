import { useState } from 'react';
import { FileText, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { generateReport } from '../../engine/reportEngine';

const SECTIONS = [
    { id: 'cover', label: 'Cover Page', description: 'Title, dataset name, date range', default: true },
    { id: 'executive', label: 'Executive Summary', description: 'Top 5 KPIs + Top 3 insights', default: true },
    { id: 'kpis', label: 'KPI Dashboard', description: 'Charts, values, growth indicators', default: true },
    { id: 'insights', label: 'AI Insights Section', description: 'Trends, anomalies, forecast summary', default: true },
    { id: 'appendix', label: 'Appendix', description: 'Data schema, filters, methodology', default: true },
];

export function ReportPage() {
    const { state } = useStore();
    const [sections, setSections] = useState<Record<string, boolean>>(
        Object.fromEntries(SECTIONS.map(s => [s.id, s.default]))
    );
    const [exporting, setExporting] = useState(false);
    const [exported, setExported] = useState(false);

    const handleExport = async () => {
        if (!state.dataset) return;
        setExporting(true);
        setExported(false);

        try {
            await generateReport(state.dataset, state.kpis, state.insights);
            setExported(true);
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setExporting(false);
        }
    };

    if (!state.dataset) {
        return (
            <div className="empty-state">
                <FileText size={48} />
                <p>Upload a dataset first to generate a report.</p>
            </div>
        );
    }

    return (
        <div className="report-page">
            <div className="section-header">
                <div>
                    <h2 className="section-title">Export PDF Report</h2>
                    <p className="section-sub">Generate an executive-ready analytics report</p>
                </div>
            </div>

            <div className="report-config">
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Report Details</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                        <div>
                            <span style={{ color: 'var(--text-muted)' }}>Dataset:</span>{' '}
                            <strong>{state.dataset.fileName}</strong>
                        </div>
                        <div>
                            <span style={{ color: 'var(--text-muted)' }}>Records:</span>{' '}
                            <strong>{state.dataset.schema.rowCount.toLocaleString()}</strong>
                        </div>
                        <div>
                            <span style={{ color: 'var(--text-muted)' }}>Active KPIs:</span>{' '}
                            <strong>{state.kpis.filter(k => k.accepted).length}</strong>
                        </div>
                        <div>
                            <span style={{ color: 'var(--text-muted)' }}>Insights:</span>{' '}
                            <strong>{state.insights.length}</strong>
                        </div>
                    </div>
                </div>

                <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Sections to Include</h3>
                <div className="report-section-list">
                    {SECTIONS.map(section => (
                        <label key={section.id} className="report-section-item" style={{ cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={sections[section.id]}
                                onChange={e => setSections({ ...sections, [section.id]: e.target.checked })}
                            />
                            <div>
                                <div style={{ fontWeight: 600 }}>{section.label}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{section.description}</div>
                            </div>
                        </label>
                    ))}
                </div>

                <button
                    className="btn btn-primary"
                    onClick={handleExport}
                    disabled={exporting}
                    style={{ marginTop: '1.5rem', padding: '0.75rem 2rem', fontSize: '1rem' }}
                >
                    {exporting ? (
                        <>
                            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generating...
                        </>
                    ) : exported ? (
                        <>
                            <CheckCircle2 size={18} /> Downloaded!
                        </>
                    ) : (
                        <>
                            <Download size={18} /> Generate & Download PDF
                        </>
                    )}
                </button>

                {exported && (
                    <p style={{ marginTop: '1rem', color: 'var(--success)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={14} /> Report saved as "{state.dataset.fileName.replace('.csv', '')}_report.pdf"
                    </p>
                )}
            </div>
        </div>
    );
}
