export interface ColumnSchema {
    name: string;
    type: 'numeric' | 'date' | 'categorical' | 'boolean' | 'unknown';
    sampleValues: string[];
    uniqueCount: number;
    missingCount: number;
    missingPercent: number;
    errors: string[];
}

export interface DatasetSchema {
    columns: ColumnSchema[];
    rowCount: number;
    duplicateRowCount: number;
    totalMissing: number;
    overallQuality: number; // 0-100
}

export interface ParsedDataset {
    raw: Record<string, unknown>[];
    schema: DatasetSchema;
    fileName: string;
    fileSize: number;
    uploadedAt: Date;
}

export interface KPI {
    id: string;
    name: string;
    value: number | string;
    formattedValue: string;
    change?: number; // percentage
    changeLabel?: string;
    category: 'aggregate' | 'timeseries' | 'segmentation';
    column: string;
    secondaryColumn?: string;
    sparklineData?: number[];
    accepted: boolean;
}

export interface Insight {
    id: string;
    type: 'trend' | 'anomaly' | 'correlation' | 'forecast' | 'segmentation';
    headline: string;
    metric: string;
    explanation: string;
    confidence: 'high' | 'medium' | 'low';
    impact: number; // 0-100 for ranking
    chartData?: unknown;
    bookmarked: boolean;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    tableData?: Record<string, unknown>[];
    chartData?: { name: string; value: number }[];
    chartType?: 'bar' | 'line' | 'pie';
}

export interface QueryResult {
    answer: string;
    data?: Record<string, unknown>[];
    chartData?: { name: string; value: number }[];
    chartType?: 'bar' | 'line' | 'pie';
}

export type AppPage = 'upload' | 'dashboard' | 'insights' | 'chat' | 'report';
