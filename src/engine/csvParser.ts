import Papa from 'papaparse';
import type { ParsedDataset, ColumnSchema, DatasetSchema } from '../types';

function detectColumnType(values: unknown[]): 'numeric' | 'date' | 'categorical' | 'boolean' | 'unknown' {
    const nonEmpty = values.filter(v => v !== null && v !== undefined && v !== '');
    if (nonEmpty.length === 0) return 'unknown';

    const sample = nonEmpty.slice(0, 100);

    // Check boolean
    const boolValues = new Set(['true', 'false', 'yes', 'no', '0', '1']);
    const boolCount = sample.filter(v => boolValues.has(String(v).toLowerCase().trim())).length;
    if (boolCount / sample.length > 0.9) return 'boolean';

    // Check numeric
    const numCount = sample.filter(v => {
        const s = String(v).replace(/[,$%]/g, '').trim();
        return s !== '' && !isNaN(Number(s));
    }).length;
    if (numCount / sample.length > 0.8) return 'numeric';

    // Check date
    const datePatterns = [
        /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,
        /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/,
        /^\w+ \d{1,2},? \d{4}$/,
        /^\d{4}[-/]\d{1,2}[-/]\d{1,2}[T ]\d{1,2}:\d{2}/,
        /^\d{1,2}[-/]\w{3}[-/]\d{2,4}$/,
    ];
    const dateCount = sample.filter(v => {
        const s = String(v).trim();
        if (datePatterns.some(p => p.test(s))) return true;
        const d = new Date(s);
        return !isNaN(d.getTime()) && s.length > 4;
    }).length;
    if (dateCount / sample.length > 0.7) return 'date';

    return 'categorical';
}

function findDuplicates(rows: Record<string, unknown>[]): number {
    const seen = new Set<string>();
    let dupes = 0;
    for (const row of rows) {
        const key = JSON.stringify(row);
        if (seen.has(key)) dupes++;
        else seen.add(key);
    }
    return dupes;
}

export function parseCSV(file: File): Promise<ParsedDataset> {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const data = results.data as Record<string, unknown>[];
                if (data.length === 0) {
                    reject(new Error('CSV file is empty or has no valid rows.'));
                    return;
                }

                const headers = Object.keys(data[0]);
                const columns: ColumnSchema[] = headers.map(name => {
                    const values = data.map(row => row[name]);
                    const nonEmpty = values.filter(v => v !== null && v !== undefined && v !== '');
                    const missingCount = values.length - nonEmpty.length;
                    const type = detectColumnType(values);
                    const uniqueValues = new Set(nonEmpty.map(v => String(v)));
                    const errors: string[] = [];

                    if (missingCount > values.length * 0.5) {
                        errors.push(`${((missingCount / values.length) * 100).toFixed(0)}% values missing`);
                    }
                    if (type === 'numeric') {
                        const badNums = nonEmpty.filter(v => {
                            const s = String(v).replace(/[,$%]/g, '').trim();
                            return isNaN(Number(s));
                        });
                        if (badNums.length > 0) {
                            errors.push(`${badNums.length} non-numeric values found`);
                        }
                    }

                    return {
                        name,
                        type,
                        sampleValues: nonEmpty.slice(0, 5).map(v => String(v)),
                        uniqueCount: uniqueValues.size,
                        missingCount,
                        missingPercent: (missingCount / values.length) * 100,
                        errors,
                    };
                });

                const duplicateRowCount = findDuplicates(data);
                const totalMissing = columns.reduce((sum, c) => sum + c.missingCount, 0);
                const totalCells = data.length * columns.length;
                const errorColumns = columns.filter(c => c.errors.length > 0).length;
                const overallQuality = Math.max(
                    0,
                    100 - (totalMissing / totalCells) * 50 - (duplicateRowCount / data.length) * 20 - errorColumns * 5
                );

                const schema: DatasetSchema = {
                    columns,
                    rowCount: data.length,
                    duplicateRowCount,
                    totalMissing,
                    overallQuality: Math.round(overallQuality),
                };

                resolve({
                    raw: data,
                    schema,
                    fileName: file.name,
                    fileSize: file.size,
                    uploadedAt: new Date(),
                });
            },
            error: (error) => {
                reject(new Error(`CSV parsing failed: ${error.message}`));
            },
        });
    });
}

export function cleanNumericValue(val: unknown): number {
    if (val === null || val === undefined || val === '') return 0;
    const s = String(val).replace(/[,$%]/g, '').trim();
    const n = Number(s);
    return isNaN(n) ? 0 : n;
}

export function parseDate(val: unknown): Date | null {
    if (val === null || val === undefined || val === '') return null;
    const d = new Date(String(val));
    return isNaN(d.getTime()) ? null : d;
}
