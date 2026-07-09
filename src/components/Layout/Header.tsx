import { Download, RotateCcw } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { generateReport } from '../../engine/reportEngine';

const pageTitles: Record<string, string> = {
    upload: 'Upload Dataset',
    dashboard: 'Dashboard',
    insights: 'AI Insights',
    chat: 'Ask Questions',
    report: 'Export Report',
};

export function Header() {
    const { state, dispatch } = useStore();

    const handleExport = async () => {
        if (!state.dataset) return;
        await generateReport(state.dataset, state.kpis, state.insights);
    };

    return (
        <header className="header">
            <h1 className="header-title">{pageTitles[state.currentPage] || 'Analytics'}</h1>
            <div className="header-actions">
                {state.dataset && (
                    <>
                        <button className="btn" onClick={handleExport}>
                            <Download size={16} /> Export PDF
                        </button>
                        <button className="btn" onClick={() => dispatch({ type: 'RESET' })}>
                            <RotateCcw size={16} /> New Dataset
                        </button>
                    </>
                )}
            </div>
        </header>
    );
}
