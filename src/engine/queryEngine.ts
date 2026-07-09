import type { ParsedDataset, QueryResult } from '../types';
import { cleanNumericValue } from './csvParser';

interface ParsedQuery {
    aggregation?: 'sum' | 'average' | 'count' | 'min' | 'max';
    column?: string;
    filterColumn?: string;
    filterValue?: string;
    topN?: number;
    groupBy?: string;
    comparison?: { a: string; b: string; column: string };
    isTrend?: boolean;
}

function findBestColumnMatch(query: string, columns: string[]): string | undefined {
    const q = query.toLowerCase();
    // Exact match first
    for (const col of columns) {
        if (q.includes(col.toLowerCase())) return col;
    }
    // Partial match
    for (const col of columns) {
        const words = col.toLowerCase().split(/[_\s]+/);
        if (words.some(w => w.length > 2 && q.includes(w))) return col;
    }
    return undefined;
}

function parseNaturalLanguage(query: string, columns: string[], catValues: Record<string, string[]>): ParsedQuery {
    const q = query.toLowerCase().trim();
    const parsed: ParsedQuery = {};

    // Detect aggregation
    if (/\b(total|sum)\b/.test(q)) parsed.aggregation = 'sum';
    else if (/\b(average|avg|mean)\b/.test(q)) parsed.aggregation = 'average';
    else if (/\b(count|how many|number of)\b/.test(q)) parsed.aggregation = 'count';
    else if (/\b(minimum|min|lowest|smallest)\b/.test(q)) parsed.aggregation = 'min';
    else if (/\b(maximum|max|highest|largest|biggest)\b/.test(q)) parsed.aggregation = 'max';
    else parsed.aggregation = 'sum'; // default

    // Detect column
    parsed.column = findBestColumnMatch(q, columns);

    // Detect top N
    const topMatch = q.match(/top\s+(\d+)/);
    if (topMatch) parsed.topN = parseInt(topMatch[1]);

    // Detect groupBy
    const byMatch = q.match(/\bby\s+(\w[\w\s]*?)(?:\s+in|\s+for|\s+where|\?|$)/i);
    if (byMatch) {
        const groupCol = findBestColumnMatch(byMatch[1], columns);
        if (groupCol && groupCol !== parsed.column) parsed.groupBy = groupCol;
    }

    // Detect filter
    for (const [col, values] of Object.entries(catValues)) {
        for (const val of values) {
            if (q.includes(val.toLowerCase())) {
                parsed.filterColumn = col;
                parsed.filterValue = val;
                break;
            }
        }
        if (parsed.filterColumn) break;
    }

    // Detect comparison
    const vsMatch = q.match(/compare\s+(.+?)\s+(?:vs|versus|and|with)\s+(.+?)(?:\s|$)/i);
    if (vsMatch) {
        parsed.comparison = { a: vsMatch[1].trim(), b: vsMatch[2].trim(), column: parsed.column || '' };
    }

    // Detect trend
    if (/\b(trend|over time|change|growth|decline)\b/.test(q)) {
        parsed.isTrend = true;
    }

    return parsed;
}

export function executeQuery(query: string, dataset: ParsedDataset): QueryResult {
    const { raw, schema } = dataset;
    const columns = schema.columns.map(c => c.name);
    const numericCols = schema.columns.filter(c => c.type === 'numeric').map(c => c.name);
    const catCols = schema.columns.filter(c => c.type === 'categorical');

    const catValues: Record<string, string[]> = {};
    for (const col of catCols) {
        const uniq = [...new Set(raw.map(r => String(r[col.name] || '')).filter(Boolean))];
        catValues[col.name] = uniq.slice(0, 50);
    }

    const parsed = parseNaturalLanguage(query, columns, catValues);

    if (!parsed.column && numericCols.length > 0) {
        parsed.column = numericCols[0];
    }

    if (!parsed.column) {
        return { answer: `I couldn't identify which column you're referring to. Available columns: ${columns.join(', ')}` };
    }

    let filteredData = [...raw];

    // Apply filter
    if (parsed.filterColumn && parsed.filterValue) {
        filteredData = filteredData.filter(r =>
            String(r[parsed.filterColumn!]).toLowerCase() === parsed.filterValue!.toLowerCase()
        );
        if (filteredData.length === 0) {
            return { answer: `No data found for ${parsed.filterColumn} = "${parsed.filterValue}".` };
        }
    }

    // Handle comparison
    if (parsed.comparison) {
        const col = parsed.column;
        const catCol = catCols.find(c => {
            const vals = catValues[c.name]?.map(v => v.toLowerCase()) || [];
            return vals.includes(parsed.comparison!.a.toLowerCase()) || vals.includes(parsed.comparison!.b.toLowerCase());
        });

        if (catCol) {
            const dataA = raw.filter(r => String(r[catCol.name]).toLowerCase().includes(parsed.comparison!.a.toLowerCase()));
            const dataB = raw.filter(r => String(r[catCol.name]).toLowerCase().includes(parsed.comparison!.b.toLowerCase()));
            const sumA = dataA.reduce((s, r) => s + cleanNumericValue(r[col]), 0);
            const sumB = dataB.reduce((s, r) => s + cleanNumericValue(r[col]), 0);

            return {
                answer: `**${parsed.comparison.a}**: ${sumA.toLocaleString()} vs **${parsed.comparison.b}**: ${sumB.toLocaleString()} (${col}). ${sumA > sumB ? parsed.comparison.a : parsed.comparison.b} is higher by ${Math.abs(sumA - sumB).toLocaleString()}.`,
                chartData: [
                    { name: parsed.comparison.a, value: sumA },
                    { name: parsed.comparison.b, value: sumB },
                ],
                chartType: 'bar',
            };
        }
    }

    // Handle groupBy / top N
    if (parsed.groupBy || parsed.topN) {
        const groupCol = parsed.groupBy || catCols[0]?.name;
        if (!groupCol) {
            return { answer: `No categorical column found to group by.` };
        }

        const groups: Record<string, number[]> = {};
        for (const row of filteredData) {
            const key = String(row[groupCol] || 'Unknown');
            if (!groups[key]) groups[key] = [];
            groups[key].push(cleanNumericValue(row[parsed.column]));
        }

        let results = Object.entries(groups).map(([name, vals]) => {
            let value: number;
            switch (parsed.aggregation) {
                case 'average': value = vals.reduce((a, b) => a + b, 0) / vals.length; break;
                case 'count': value = vals.length; break;
                case 'min': value = Math.min(...vals); break;
                case 'max': value = Math.max(...vals); break;
                default: value = vals.reduce((a, b) => a + b, 0);
            }
            return { name, value };
        }).sort((a, b) => b.value - a.value);

        if (parsed.topN) results = results.slice(0, parsed.topN);

        const tableData = results.map(r => ({ [groupCol]: r.name, [parsed.column!]: r.value.toLocaleString() }));
        const answer = results.map((r, i) => `${i + 1}. **${r.name}**: ${r.value.toLocaleString()}`).join('\n');

        return {
            answer: `**${parsed.aggregation === 'count' ? 'Count' : parsed.aggregation === 'average' ? 'Average' : 'Total'} ${parsed.column} by ${groupCol}:**\n\n${answer}`,
            data: tableData,
            chartData: results,
            chartType: 'bar',
        };
    }

    // Simple aggregation
    const values = filteredData.map(r => cleanNumericValue(r[parsed.column!]));
    let result: number;
    let aggLabel: string;

    switch (parsed.aggregation) {
        case 'average':
            result = values.reduce((a, b) => a + b, 0) / values.length;
            aggLabel = 'Average';
            break;
        case 'count':
            result = values.length;
            aggLabel = 'Count';
            break;
        case 'min':
            result = Math.min(...values);
            aggLabel = 'Minimum';
            break;
        case 'max':
            result = Math.max(...values);
            aggLabel = 'Maximum';
            break;
        default:
            result = values.reduce((a, b) => a + b, 0);
            aggLabel = 'Total';
    }

    let filterNote = '';
    if (parsed.filterColumn && parsed.filterValue) {
        filterNote = ` (filtered by ${parsed.filterColumn} = "${parsed.filterValue}")`;
    }

    return {
        answer: `The **${aggLabel} ${parsed.column}** is **${result.toLocaleString()}**${filterNote}.\n\nBased on ${values.length.toLocaleString()} records.`,
    };
}

export function getSuggestions(dataset: ParsedDataset): string[] {
    const { schema } = dataset;
    const numCols = schema.columns.filter(c => c.type === 'numeric');
    const catCols = schema.columns.filter(c => c.type === 'categorical');
    const suggestions: string[] = [];

    if (numCols.length > 0) {
        suggestions.push(`What is the total ${numCols[0].name}?`);
        suggestions.push(`What is the average ${numCols[0].name}?`);
    }
    if (catCols.length > 0 && numCols.length > 0) {
        suggestions.push(`Top 5 ${catCols[0].name} by ${numCols[0].name}`);
        suggestions.push(`Show ${numCols[0].name} by ${catCols[0].name}`);
    }
    if (numCols.length > 1) {
        suggestions.push(`What is the maximum ${numCols[1].name}?`);
    }
    suggestions.push('How many records are there?');

    return suggestions.slice(0, 6);
}
