import { TrendingUp, AlertTriangle, GitBranch, BarChart3, PieChart, Bookmark } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart, BarChart, Bar, Cell, ReferenceLine } from 'recharts';
import { useStore } from '../../store/useStore';
import type { Insight } from '../../types';

const typeConfig: Record<string, { icon: typeof TrendingUp; emoji: string; label: string }> = {
    trend: { icon: TrendingUp, emoji: '📈', label: 'Trend' },
    anomaly: { icon: AlertTriangle, emoji: '⚠️', label: 'Anomaly' },
    correlation: { icon: GitBranch, emoji: '🔗', label: 'Correlation' },
    forecast: { icon: BarChart3, emoji: '🔮', label: 'Forecast' },
    segmentation: { icon: PieChart, emoji: '📊', label: 'Segmentation' },
};

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#22c55e', '#eab308', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6'];

function InsightChart({ insight }: { insight: Insight }) {
    const data = insight.chartData as Record<string, unknown> | undefined;
    if (!data) return null;

    if (insight.type === 'trend' && data.values) {
        const values = data.values as number[];
        const slope = data.slope as number;
        const intercept = data.intercept as number;
        const chartData = values.map((v, i) => ({
            index: i,
            value: v,
            trend: slope * i + intercept,
        }));

        return (
            <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="index" tick={false} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#6366f1" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="trend" stroke="#ef4444" dot={false} strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
            </ResponsiveContainer>
        );
    }

    if (insight.type === 'anomaly' && data.values) {
        const values = data.values as number[];
        const m = data.mean as number;
        const sd = data.sd as number;
        const anomalyIndices = new Set(data.anomalyIndices as number[]);
        const chartData = values.map((v, i) => ({
            index: i,
            value: v,
            isAnomaly: anomalyIndices.has(i),
        }));

        return (
            <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="index" tick={false} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <ReferenceLine y={m + 2 * sd} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '+2σ', fill: '#ef4444', fontSize: 10 }} />
                    <ReferenceLine y={m - 2 * sd} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '-2σ', fill: '#ef4444', fontSize: 10 }} />
                    <ReferenceLine y={m} stroke="#64748b" strokeDasharray="3 3" />
                    <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                        {chartData.map((entry, i) => (
                            <Cell key={i} fill={entry.isAnomaly ? '#ef4444' : '#6366f180'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        );
    }

    if (insight.type === 'forecast' && data.historical) {
        const historical = data.historical as number[];
        const forecast = data.forecast as number[];
        const upper = data.upper as number[];
        const lower = data.lower as number[];

        const chartData = [
            ...historical.map((v, i) => ({ index: i, actual: v, forecast: undefined as number | undefined, upper: undefined as number | undefined, lower: undefined as number | undefined })),
            ...forecast.map((v, i) => ({
                index: historical.length + i,
                actual: undefined as number | undefined,
                forecast: v,
                upper: upper[i],
                lower: lower[i],
            })),
        ];

        // Connect last historical point to first forecast
        if (chartData.length > historical.length) {
            chartData[historical.length - 1].forecast = historical[historical.length - 1];
        }

        return (
            <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="confFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="index" tick={false} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="upper" stroke="none" fill="url(#confFill)" />
                    <Area type="monotone" dataKey="lower" stroke="none" fill="transparent" />
                    <Line type="monotone" dataKey="actual" stroke="#6366f1" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="forecast" stroke="#22c55e" dot={false} strokeWidth={2} strokeDasharray="5 5" />
                </AreaChart>
            </ResponsiveContainer>
        );
    }

    if (insight.type === 'segmentation' && data.segments) {
        const segments = (data.segments as { name: string; value: number }[]).slice(0, 8);
        return (
            <ResponsiveContainer width="100%" height={160}>
                <BarChart data={segments} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {segments.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        );
    }

    return null;
}

export function InsightsPage() {
    const { state, dispatch } = useStore();
    const { insights } = state;

    if (insights.length === 0) {
        return (
            <div className="empty-state">
                <BarChart3 />
                <p>No insights generated yet. Upload a dataset first.</p>
            </div>
        );
    }

    const insightsByType = insights.reduce<Record<string, Insight[]>>((acc, insight) => {
        if (!acc[insight.type]) acc[insight.type] = [];
        acc[insight.type].push(insight);
        return acc;
    }, {});

    return (
        <div className="insights-page">
            <div className="section-header">
                <div>
                    <h2 className="section-title">AI-Generated Insights</h2>
                    <p className="section-sub">
                        {insights.length} insights discovered · Ranked by impact
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {Object.entries(insightsByType).map(([type, items]) => (
                        <span key={type} className={`type-badge ${type === 'numeric' ? 'numeric' : type === 'trend' ? 'date' : type === 'anomaly' ? 'unknown' : type === 'correlation' ? 'boolean' : 'categorical'}`}>
                            {typeConfig[type]?.emoji} {items.length} {typeConfig[type]?.label}
                        </span>
                    ))}
                </div>
            </div>

            <div className="insights-feed">
                {insights.map(insight => (
                    <div key={insight.id} className="insight-card">
                        <div className="insight-header">
                            <div className={`insight-type-icon ${insight.type}`}>
                                {typeConfig[insight.type]?.emoji || '📊'}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div className="insight-headline">{insight.headline}</div>
                                <div className="insight-metric">{insight.metric}</div>
                            </div>
                            <span className={`confidence-badge ${insight.confidence}`}>
                                {insight.confidence === 'high' ? '●' : insight.confidence === 'medium' ? '◐' : '○'} {insight.confidence}
                            </span>
                        </div>

                        <div className="insight-explanation">{insight.explanation}</div>

                        <InsightChart insight={insight} />

                        <div className="insight-actions">
                            <button
                                className={`bookmark-btn ${insight.bookmarked ? 'active' : ''}`}
                                onClick={() => dispatch({ type: 'TOGGLE_BOOKMARK', id: insight.id })}
                            >
                                <Bookmark size={16} fill={insight.bookmarked ? 'currentColor' : 'none'} />
                            </button>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                Impact Score: {Math.round(insight.impact)}/100
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
