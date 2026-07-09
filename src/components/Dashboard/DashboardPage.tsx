import { Check, TrendingUp, TrendingDown } from 'lucide-react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useStore } from '../../store/useStore';
import { cleanNumericValue, parseDate } from '../../engine/csvParser';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#3b82f6', '#22c55e', '#eab308', '#ef4444', '#ec4899', '#14b8a6'];

function SparklineBar({ data }: { data: number[] }) {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data);
    return (
        <div className="kpi-sparkline" style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
            {data.map((v, i) => (
                <div
                    key={i}
                    style={{
                        flex: 1,
                        height: `${max > 0 ? (v / max) * 100 : 0}%`,
                        minHeight: 2,
                        borderRadius: 2,
                        background: `linear-gradient(to top, rgba(99,102,241,0.3), rgba(99,102,241,0.8))`,
                        transition: 'height 0.3s ease',
                    }}
                />
            ))}
        </div>
    );
}

export function DashboardPage() {
    const { state, dispatch } = useStore();
    const { kpis, dataset } = state;

    if (!dataset) return null;

    const acceptedKpis = kpis.filter(k => k.accepted);
    const rejectedKpis = kpis.filter(k => !k.accepted);

    // Prepare chart data
    const numCols = dataset.schema.columns.filter(c => c.type === 'numeric');
    const catCols = dataset.schema.columns.filter(c => c.type === 'categorical');
    const dateCols = dataset.schema.columns.filter(c => c.type === 'date');

    // Time series chart data
    let timeSeriesData: Record<string, unknown>[] = [];
    if (dateCols.length > 0 && numCols.length > 0) {
        const dateCol = dateCols[0].name;
        const sorted = [...dataset.raw].sort((a, b) => {
            const da = parseDate(a[dateCol]);
            const db = parseDate(b[dateCol]);
            return (da?.getTime() || 0) - (db?.getTime() || 0);
        });

        // Aggregate by chunks for readability
        const chunkSize = Math.max(1, Math.floor(sorted.length / 30));
        for (let i = 0; i < sorted.length; i += chunkSize) {
            const chunk = sorted.slice(i, i + chunkSize);
            const point: Record<string, unknown> = { name: String(chunk[0][dateCol]).substring(0, 10) };
            for (const col of numCols.slice(0, 3)) {
                point[col.name] = chunk.reduce((s, r) => s + cleanNumericValue(r[col.name]), 0) / chunk.length;
            }
            timeSeriesData.push(point);
        }
        if (timeSeriesData.length > 50) timeSeriesData = timeSeriesData.slice(-50);
    }

    // Bar chart data
    let barData: { name: string; value: number }[] = [];
    if (catCols.length > 0 && numCols.length > 0) {
        const groups: Record<string, number> = {};
        for (const row of dataset.raw) {
            const key = String(row[catCols[0].name] || 'Unknown');
            groups[key] = (groups[key] || 0) + cleanNumericValue(row[numCols[0].name]);
        }
        barData = Object.entries(groups)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
    }

    // Pie chart data
    let pieData = barData.slice(0, 6);
    if (pieData.length > 5) {
        const rest = pieData.slice(4);
        pieData = [...pieData.slice(0, 4), { name: 'Others', value: rest.reduce((s, d) => s + d.value, 0) }];
    }

    return (
        <div className="dashboard-page">
            <div className="section-header">
                <div>
                    <h2 className="section-title">Key Performance Indicators</h2>
                    <p className="section-sub">{acceptedKpis.length} active · {rejectedKpis.length} hidden</p>
                </div>
            </div>

            <div className="kpi-grid">
                {[...acceptedKpis, ...rejectedKpis].map(kpi => (
                    <div key={kpi.id} className={`kpi-card ${!kpi.accepted ? 'rejected' : ''}`}>
                        <div className="kpi-header">
                            <span className="kpi-name">{kpi.name}</span>
                            <button
                                className={`kpi-toggle ${kpi.accepted ? 'active' : ''}`}
                                onClick={() => dispatch({ type: 'TOGGLE_KPI', id: kpi.id })}
                                title={kpi.accepted ? 'Hide KPI' : 'Show KPI'}
                            >
                                {kpi.accepted && <Check size={14} />}
                            </button>
                        </div>
                        <div className="kpi-value">{kpi.formattedValue}</div>
                        {kpi.change !== undefined && (
                            <span className={`kpi-change ${kpi.change >= 0 ? 'positive' : 'negative'}`}>
                                {kpi.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {Math.abs(kpi.change)}% {kpi.changeLabel}
                            </span>
                        )}
                        {kpi.sparklineData && <SparklineBar data={kpi.sparklineData} />}
                    </div>
                ))}
            </div>

            <div className="charts-section">
                {timeSeriesData.length > 0 && (
                    <div className="chart-card">
                        <h3 className="chart-title">
                            {numCols[0].name} Over Time
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={timeSeriesData}>
                                <defs>
                                    <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Area type="monotone" dataKey={numCols[0].name} stroke="#6366f1" fill="url(#grad1)" strokeWidth={2} />
                                {numCols[1] && <Area type="monotone" dataKey={numCols[1].name} stroke="#8b5cf6" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {barData.length > 0 && (
                    <div className="chart-card">
                        <h3 className="chart-title">
                            {numCols[0].name} by {catCols[0].name}
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {barData.map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {pieData.length > 0 && (
                    <div className="chart-card">
                        <h3 className="chart-title">
                            {catCols[0].name} Distribution
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={100}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ name, percent = 0 }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    labelLine={{ stroke: '#64748b' }}
                                >
                                    {pieData.map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {timeSeriesData.length > 0 && numCols.length > 1 && (
                    <div className="chart-card">
                        <h3 className="chart-title">Multi-Metric Trend</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={timeSeriesData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend />
                                {numCols.slice(0, 3).map((col, i) => (
                                    <Area key={col.name} type="monotone" dataKey={col.name}
                                        stroke={CHART_COLORS[i]} fill="transparent" strokeWidth={2} />
                                ))}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}
