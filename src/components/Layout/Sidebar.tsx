import { Upload, LayoutDashboard, Lightbulb, MessageSquare, FileText, Database } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { AppPage } from '../../types';

const navItems: { page: AppPage; label: string; icon: typeof Upload }[] = [
    { page: 'upload', label: 'Upload Data', icon: Upload },
    { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { page: 'insights', label: 'AI Insights', icon: Lightbulb },
    { page: 'chat', label: 'Ask Questions', icon: MessageSquare },
    { page: 'report', label: 'Export Report', icon: FileText },
];

export function Sidebar() {
    const { state, dispatch } = useStore();
    const hasData = !!state.dataset;

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">A</div>
                <span className="sidebar-title">Analytics AI</span>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(({ page, label, icon: Icon }) => (
                    <button
                        key={page}
                        className={`nav-item ${state.currentPage === page ? 'active' : ''} ${!hasData && page !== 'upload' ? 'disabled' : ''
                            }`}
                        onClick={() => dispatch({ type: 'SET_PAGE', page })}
                    >
                        <Icon />
                        <span>{label}</span>
                    </button>
                ))}
            </nav>

            {state.dataset && (
                <div className="sidebar-dataset-info">
                    <div className="dataset-badge">
                        <Database size={14} />
                        <div>
                            <div className="name">{state.dataset.fileName}</div>
                            <div>{state.dataset.schema.rowCount.toLocaleString()} rows</div>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
