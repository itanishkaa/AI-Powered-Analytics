import type { ParsedDataset, Insight } from '../types';
import { cleanNumericValue, parseDate } from './csvParser';
// @ts-expect-error - no types for regression
import regression from 'regression';
import {
    mean,
    standardDeviation,
    sampleCorrelation,
} from 'simple-statistics';

let idCounter = 0;
function genId() { return `insight-${++idCounter}`; }

function getCleanNumericArray(data: Record<string, unknown>[], col: string): number[] {
    return data.map(r => cleanNumericValue(r[col])).filter(v => !isNaN(v));
}

function detectTrends(dataset: ParsedDataset): Insight[] {
    const insights: Insight[] = [];
    const { raw, schema } = dataset;
    const numCols = schema.columns.filter(c => c.type === 'numeric');
    const dateCols = schema.columns.filter(c => c.type === 'date');
    const dateCol = dateCols[0]?.name;

    for (const col of numCols.slice(0, 5)) {
        let values: number[];
        if (dateCol) {
            const sorted = [...raw].sort((a, b) => {
                const da = parseDate(a[dateCol]);
                const db = parseDate(b[dateCol]);
                return (da?.getTime() || 0) - (db?.getTime() || 0);
            });
            values = sorted.map(r => cleanNumericValue(r[col.name]));
        } else {
            values = raw.map(r => cleanNumericValue(r[col.name]));
        }

        if (values.length < 5) continue;

        const points: [number, number][] = values.map((v, i) => [i, v]);
        const result = regression.linear(points);
        const slope = result.equation[0];
        const avgVal = mean(values);

        if (Math.abs(slope) < avgVal * 0.001) continue;

        const direction = slope > 0 ? 'increasing' : 'decreasing';
        const pctChange = avgVal !== 0 ? ((slope * values.length) / Math.abs(avgVal)) * 100 : 0;

        insights.push({
            id: genId(),
            type: 'trend',
            headline: `${col.name} is ${direction} over the dataset`,
            metric: `${Math.abs(pctChange).toFixed(1)}% overall ${direction === 'increasing' ? 'growth' : 'decline'}`,
            explanation: `Linear regression shows a ${direction} trend in ${col.name} with a slope of ${slope.toFixed(4)} per data point. R² = ${result.r2.toFixed(3)}.`,
            confidence: result.r2 > 0.7 ? 'high' : result.r2 > 0.4 ? 'medium' : 'low',
            impact: Math.min(100, Math.abs(pctChange)),
            chartData: { values, slope, intercept: result.equation[1], r2: result.r2, colName: col.name },
            bookmarked: false,
        });
    }
    return insights;
}

function detectAnomalies(dataset: ParsedDataset): Insight[] {
    const insights: Insight[] = [];
    const { raw, schema } = dataset;
    const numCols = schema.columns.filter(c => c.type === 'numeric');

    for (const col of numCols.slice(0, 5)) {
        const values = getCleanNumericArray(raw, col.name);
        if (values.length < 10) continue;

        const m = mean(values);
        const sd = standardDeviation(values);
        if (sd === 0) continue;

        const anomalies = values
            .map((v, i) => ({ value: v, index: i, zScore: (v - m) / sd }))
            .filter(a => Math.abs(a.zScore) > 2)
            .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));

        if (anomalies.length > 0) {
            const top = anomalies[0];
            const direction = top.zScore > 0 ? 'spike' : 'drop';
            insights.push({
                id: genId(),
                type: 'anomaly',
                headline: `Detected ${anomalies.length} anomal${anomalies.length === 1 ? 'y' : 'ies'} in ${col.name}`,
                metric: `Most significant: ${direction} of ${top.value.toLocaleString()} (z-score: ${top.zScore.toFixed(2)})`,
                explanation: `${anomalies.length} values deviate more than 2 standard deviations from the mean (${m.toFixed(2)} ± ${sd.toFixed(2)}). This indicates unusual ${direction}s that may warrant investigation.`,
                confidence: anomalies.length <= values.length * 0.05 ? 'high' : 'medium',
                impact: Math.min(100, Math.abs(top.zScore) * 20),
                chartData: { values, mean: m, sd, anomalyIndices: anomalies.map(a => a.index), colName: col.name },
                bookmarked: false,
            });
        }
    }
    return insights;
}

function detectCorrelations(dataset: ParsedDataset): Insight[] {
    const insights: Insight[] = [];
    const { raw, schema } = dataset;
    const numCols = schema.columns.filter(c => c.type === 'numeric').slice(0, 8);

    const matrix: { col1: string; col2: string; correlation: number }[] = [];

    for (let i = 0; i < numCols.length; i++) {
        for (let j = i + 1; j < numCols.length; j++) {
            const vals1 = getCleanNumericArray(raw, numCols[i].name);
            const vals2 = getCleanNumericArray(raw, numCols[j].name);
            const len = Math.min(vals1.length, vals2.length);
            if (len < 5) continue;

            try {
                const corr = sampleCorrelation(vals1.slice(0, len), vals2.slice(0, len));
                if (!isNaN(corr)) {
                    matrix.push({ col1: numCols[i].name, col2: numCols[j].name, correlation: corr });
                }
            } catch { /* skip */ }
        }
    }

    const strong = matrix.filter(m => Math.abs(m.correlation) > 0.5).sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

    for (const pair of strong.slice(0, 5)) {
        const direction = pair.correlation > 0 ? 'positive' : 'negative';
        const strength = Math.abs(pair.correlation) > 0.8 ? 'strong' : 'moderate';
        insights.push({
            id: genId(),
            type: 'correlation',
            headline: `${strength} ${direction} correlation between ${pair.col1} and ${pair.col2}`,
            metric: `r = ${pair.correlation.toFixed(3)}`,
            explanation: `${pair.col1} and ${pair.col2} show a ${strength} ${direction} relationship (r=${pair.correlation.toFixed(3)}). When ${pair.col1} ${pair.correlation > 0 ? 'increases' : 'increases'}, ${pair.col2} tends to ${pair.correlation > 0 ? 'increase' : 'decrease'}.`,
            confidence: Math.abs(pair.correlation) > 0.8 ? 'high' : 'medium',
            impact: Math.abs(pair.correlation) * 80,
            chartData: { matrix, pair },
            bookmarked: false,
        });
    }

    if (matrix.length > 0) {
        insights.push({
            id: genId(),
            type: 'correlation',
            headline: 'Correlation matrix computed across numeric columns',
            metric: `${matrix.length} pairs analyzed, ${strong.length} significant`,
            explanation: `Analyzed ${matrix.length} column pairs. Found ${strong.length} pairs with |r| > 0.5.`,
            confidence: 'high',
            impact: 40,
            chartData: { matrix, columns: numCols.map(c => c.name) },
            bookmarked: false,
        });
    }

    return insights;
}

function generateForecasts(dataset: ParsedDataset): Insight[] {
    const insights: Insight[] = [];
    const { raw, schema } = dataset;
    const numCols = schema.columns.filter(c => c.type === 'numeric');
    const dateCols = schema.columns.filter(c => c.type === 'date');
    if (dateCols.length === 0 || numCols.length === 0) return insights;

    const dateCol = dateCols[0].name;
    const sorted = [...raw].sort((a, b) => {
        const da = parseDate(a[dateCol]);
        const db = parseDate(b[dateCol]);
        return (da?.getTime() || 0) - (db?.getTime() || 0);
    });

    for (const col of numCols.slice(0, 3)) {
        const values = sorted.map(r => cleanNumericValue(r[col.name]));
        if (values.length < 10) continue;

        const points: [number, number][] = values.map((v, i) => [i, v]);
        const result = regression.linear(points);

        const forecastPoints = 10;
        const forecast: number[] = [];
        for (let i = 0; i < forecastPoints; i++) {
            forecast.push(result.predict(values.length + i)[1]);
        }

        const sd = standardDeviation(values);
        const upper = forecast.map(v => v + 1.96 * sd * 0.3);
        const lower = forecast.map(v => v - 1.96 * sd * 0.3);

        const lastVal = values[values.length - 1];
        const forecastEnd = forecast[forecast.length - 1];
        const changeDir = forecastEnd > lastVal ? 'increase' : 'decrease';

        insights.push({
            id: genId(),
            type: 'forecast',
            headline: `${col.name} projected to ${changeDir} over the next period`,
            metric: `Forecast: ${forecastEnd.toFixed(2)} (${changeDir === 'increase' ? '+' : ''}${((forecastEnd - lastVal) / Math.abs(lastVal || 1) * 100).toFixed(1)}%)`,
            explanation: `Based on linear trend analysis (R²=${result.r2.toFixed(3)}), ${col.name} is projected to ${changeDir}. Confidence interval shown at 95%.`,
            confidence: result.r2 > 0.6 ? 'high' : result.r2 > 0.3 ? 'medium' : 'low',
            impact: Math.min(90, Math.abs((forecastEnd - lastVal) / Math.abs(lastVal || 1) * 100)),
            chartData: { historical: values, forecast, upper, lower, r2: result.r2, colName: col.name },
            bookmarked: false,
        });
    }
    return insights;
}

function segmentationInsights(dataset: ParsedDataset): Insight[] {
    const insights: Insight[] = [];
    const { raw, schema } = dataset;
    const numCols = schema.columns.filter(c => c.type === 'numeric');
    const catCols = schema.columns.filter(c => c.type === 'categorical');

    for (const catCol of catCols.slice(0, 2)) {
        for (const numCol of numCols.slice(0, 2)) {
            const groups: Record<string, number> = {};
            for (const row of raw) {
                const key = String(row[catCol.name] || 'Unknown');
                groups[key] = (groups[key] || 0) + cleanNumericValue(row[numCol.name]);
            }

            const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
            if (sorted.length < 2) continue;

            const total = sorted.reduce((sum, [, v]) => sum + v, 0);
            if (total === 0) continue;

            // Pareto check
            let cumulative = 0;
            let paretoCount = 0;
            for (const [, val] of sorted) {
                cumulative += val;
                paretoCount++;
                if (cumulative >= total * 0.8) break;
            }
            const paretoPercent = (paretoCount / sorted.length) * 100;

            if (paretoPercent <= 30) {
                insights.push({
                    id: genId(),
                    type: 'segmentation',
                    headline: `${paretoPercent.toFixed(0)}% of ${catCol.name} values drive 80% of ${numCol.name}`,
                    metric: `Top ${paretoCount} out of ${sorted.length} categories`,
                    explanation: `A Pareto pattern exists: just ${paretoCount} ${catCol.name} categories account for 80% of total ${numCol.name}. The top performer is "${sorted[0][0]}" contributing ${((sorted[0][1] / total) * 100).toFixed(1)}%.`,
                    confidence: 'high',
                    impact: 70,
                    chartData: { segments: sorted.slice(0, 10).map(([name, value]) => ({ name, value })), column: catCol.name },
                    bookmarked: false,
                });
            }

            // Best/worst performer
            insights.push({
                id: genId(),
                type: 'segmentation',
                headline: `"${sorted[0][0]}" leads in ${numCol.name} by ${catCol.name}`,
                metric: `Top: ${sorted[0][0]} (${sorted[0][1].toLocaleString()}) | Bottom: ${sorted[sorted.length - 1][0]} (${sorted[sorted.length - 1][1].toLocaleString()})`,
                explanation: `Across ${sorted.length} ${catCol.name} segments, "${sorted[0][0]}" has the highest ${numCol.name} while "${sorted[sorted.length - 1][0]}" has the lowest. The gap is ${(sorted[0][1] - sorted[sorted.length - 1][1]).toLocaleString()}.`,
                confidence: 'high',
                impact: 60,
                chartData: { segments: sorted.slice(0, 10).map(([name, value]) => ({ name, value })), column: catCol.name },
                bookmarked: false,
            });
        }
    }
    return insights;
}

export function generateInsights(dataset: ParsedDataset): Insight[] {
    const all: Insight[] = [
        ...detectTrends(dataset),
        ...detectAnomalies(dataset),
        ...detectCorrelations(dataset),
        ...generateForecasts(dataset),
        ...segmentationInsights(dataset),
    ];

    // Sort by impact (highest first)
    all.sort((a, b) => b.impact - a.impact);
    return all;
}
