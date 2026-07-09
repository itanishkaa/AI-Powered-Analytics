import type { ParsedDataset, KPI, ColumnSchema } from '../types';
import { cleanNumericValue, parseDate } from './csvParser';

let idCounter = 0;
function genId() { return `kpi-${++idCounter}`; }

function formatNumber(n: number): string {
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    if (Number.isInteger(n)) return n.toLocaleString();
    return n.toFixed(2);
}

function getNumericValues(data: Record<string, unknown>[], col: string): number[] {
    return data.map(r => cleanNumericValue(r[col])).filter(v => v !== 0 || data.some(r => String(r[col]).trim() === '0'));
}

function computeSparkline(data: Record<string, unknown>[], numCol: string, dateCol: string | null): number[] {
    if (!dateCol) {
        const values = getNumericValues(data, numCol);
        const chunkSize = Math.max(1, Math.floor(values.length / 12));
        const sparkline: number[] = [];
        for (let i = 0; i < values.length; i += chunkSize) {
            const chunk = values.slice(i, i + chunkSize);
            sparkline.push(chunk.reduce((a, b) => a + b, 0) / chunk.length);
        }
        return sparkline.slice(0, 12);
    }
    const sorted = [...data].sort((a, b) => {
        const da = parseDate(a[dateCol]);
        const db = parseDate(b[dateCol]);
        return (da?.getTime() || 0) - (db?.getTime() || 0);
    });
    const values = sorted.map(r => cleanNumericValue(r[numCol]));
    const chunkSize = Math.max(1, Math.floor(values.length / 12));
    const sparkline: number[] = [];
    for (let i = 0; i < values.length; i += chunkSize) {
        const chunk = values.slice(i, i + chunkSize);
        sparkline.push(chunk.reduce((a, b) => a + b, 0) / chunk.length);
    }
    return sparkline.slice(0, 12);
}

export function generateKPIs(dataset: ParsedDataset): KPI[] {
    const { raw, schema } = dataset;
    const kpis: KPI[] = [];
    const numericCols = schema.columns.filter(c => c.type === 'numeric');
    const dateCols = schema.columns.filter(c => c.type === 'date');
    const catCols = schema.columns.filter(c => c.type === 'categorical');
    const primaryDateCol = dateCols.length > 0 ? dateCols[0].name : null;

    for (const col of numericCols) {
        const values = getNumericValues(raw, col.name);
        if (values.length === 0) continue;

        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const sparkline = computeSparkline(raw, col.name, primaryDateCol);

        // Compute change (first half vs second half)
        const half = Math.floor(values.length / 2);
        const firstHalf = values.slice(0, half);
        const secondHalf = values.slice(half);
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const change = firstAvg !== 0 ? ((secondAvg - firstAvg) / Math.abs(firstAvg)) * 100 : 0;

        kpis.push({
            id: genId(), name: `Total ${col.name}`, value: sum,
            formattedValue: formatNumber(sum), change: Math.round(change * 10) / 10,
            changeLabel: 'vs prior period', category: 'aggregate', column: col.name,
            sparklineData: sparkline, accepted: true,
        });

        kpis.push({
            id: genId(), name: `Average ${col.name}`, value: avg,
            formattedValue: formatNumber(avg), change: Math.round(change * 10) / 10,
            changeLabel: 'vs prior period', category: 'aggregate', column: col.name,
            sparklineData: sparkline, accepted: true,
        });

        if (numericCols.length <= 4) {
            kpis.push({
                id: genId(), name: `Min ${col.name}`, value: min,
                formattedValue: formatNumber(min), category: 'aggregate', column: col.name,
                accepted: false,
            });
            kpis.push({
                id: genId(), name: `Max ${col.name}`, value: max,
                formattedValue: formatNumber(max), category: 'aggregate', column: col.name,
                accepted: false,
            });
        }
    }

    // Segmentation KPIs: top performing category
    for (const catCol of catCols.slice(0, 3)) {
        for (const numCol of numericCols.slice(0, 2)) {
            const groups: Record<string, number[]> = {};
            for (const row of raw) {
                const key = String(row[catCol.name] || 'Unknown');
                if (!groups[key]) groups[key] = [];
                groups[key].push(cleanNumericValue(row[numCol.name]));
            }

            const sorted = Object.entries(groups)
                .map(([name, vals]) => ({ name, total: vals.reduce((a, b) => a + b, 0) }))
                .sort((a, b) => b.total - a.total);

            if (sorted.length > 1) {
                kpis.push({
                    id: genId(), name: `Top ${catCol.name} by ${numCol.name}`,
                    value: sorted[0].name, formattedValue: `${sorted[0].name} (${formatNumber(sorted[0].total)})`,
                    category: 'segmentation', column: numCol.name, secondaryColumn: catCol.name,
                    accepted: true,
                });
            }
        }
    }

    // Row count
    kpis.push({
        id: genId(), name: 'Total Records', value: raw.length,
        formattedValue: formatNumber(raw.length), category: 'aggregate',
        column: '_rows', accepted: true,
    });

    return kpis;
}
