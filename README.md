# 📊 AI-Powered Analytics

An interactive analytics workspace that transforms uploaded CSV datasets into actionable insights through automated KPI generation, data visualization, statistical analysis, natural-language querying, forecasting, and report generation.

The application runs client-side, with analytics and query processing handled through dedicated TypeScript engines.

## ✨ Features

### 📁 Dataset Upload
- Upload CSV datasets directly in the browser
- Parse and inspect dataset structure
- Detect numeric, date, categorical, and boolean columns
- Preview the detected schema
- Generate a data-quality summary

### 📈 Analytics Dashboard
- Automatically generate relevant KPIs
- Display KPI values and changes
- Interactive charts and visualizations
- Explore trends across the dataset
- Responsive analytics layout

### 💡 Automated Insights
- Detect trends
- Identify potential anomalies
- Surface correlations
- Generate forecasts
- Provide confidence indicators
- Bookmark useful insights

### 💬 Natural-Language Data Queries

Ask questions about the uploaded dataset, for example:

```text
What is the total revenue?
Top 5 regions by sales
Which category has the highest revenue?
What are the trends over time?
```

The query engine interprets supported questions and can return text answers, tables, and charts.

### 📄 Report Generation
- Configure report sections
- Generate downloadable PDF reports
- Include selected analytical information
- Create presentation-ready summaries

## 🧠 How the Intelligence Works

```text
CSV Dataset
     │
     ▼
┌─────────────────┐
│   csvParser     │
│ Parse + Profile │
└────────┬────────┘
         │
         ▼
┌────────────────────────────────────┐
│          Analytics Engines         │
│                                    │
│  kpiEngine                         │
│  insightsEngine                    │
│  queryEngine                       │
│  reportEngine                      │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│             React UI               │
│                                    │
│ Dashboard │ Insights │ Chat │ PDF  │
└────────────────────────────────────┘
```

The project combines statistical and rule-based analysis to generate insights and answer supported natural-language questions over uploaded datasets.

It does **not** require an external AI API or hosted LLM for its core analytics workflow.

## 🏗️ Architecture

```text
┌──────────────────────────────────────────────┐
│                  React UI                    │
│                                              │
│ Upload │ Dashboard │ Insights │ Chat │ Report│
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│              Global Application State        │
│                 useStore.tsx                 │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                Analytics Layer               │
│                                              │
│ csvParser.ts                                 │
│ kpiEngine.ts                                  │
│ insightsEngine.ts                             │
│ queryEngine.ts                                │
│ reportEngine.ts                               │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
                  Parsed Dataset
```

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript |
| Build Tool | Vite |
| Charts | Recharts |
| CSV Parsing | PapaParse |
| Statistics | simple-statistics |
| Regression / Forecasting | regression |
| PDF Generation | jsPDF |
| PDF Tables | jsPDF-AutoTable |
| UI Icons | Lucide React |
| State Management | React Context + custom store |
| Styling | Custom CSS |
| Linting | ESLint |

## 📂 Project Structure

```text
ai-powered-analytics/
├── README.md
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
│
└── src/
    ├── App.tsx
    ├── index.css
    ├── main.tsx
    │
    ├── components/
    │   ├── Chat/
    │   │   └── ChatPage.tsx
    │   ├── Dashboard/
    │   │   └── DashboardPage.tsx
    │   ├── Insights/
    │   │   └── InsightsPage.tsx
    │   ├── Layout/
    │   │   ├── Header.tsx
    │   │   └── Sidebar.tsx
    │   ├── Report/
    │   │   └── ReportPage.tsx
    │   └── Upload/
    │       └── UploadPage.tsx
    │
    ├── engine/
    │   ├── csvParser.ts
    │   ├── insightsEngine.ts
    │   ├── kpiEngine.ts
    │   ├── queryEngine.ts
    │   └── reportEngine.ts
    │
    ├── store/
    │   └── useStore.tsx
    │
    └── types/
        └── index.ts
```

## 🚀 Getting Started

### Prerequisites

- Node.js
- npm

Check your versions:

```bash
node --version
npm --version
```

### Installation

```bash
git clone https://github.com/itanishkaa/AI-Powered-Analytics.git
cd AI-Powered-Analytics
npm install
```

### Run the Development Server

```bash
npm run dev
```

Open the Vite URL shown in the terminal, typically:

```text
http://localhost:5173
```

## 📦 Production Build

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## 🧹 Linting

```bash
npm run lint
```

The project uses TypeScript strict mode and ESLint rules for React hooks and refresh-safe component exports.

## 🔍 Application Workflow

### 1. Upload

Upload a CSV file. The application parses the dataset and determines its structure, including row count, column names, column types, and data-quality information.

### 2. Review

Review the detected schema and data-quality summary before starting the analysis.

### 3. Explore the Dashboard

The dashboard derives KPIs from the dataset and presents them through cards and charts.

### 4. Discover Insights

The Insights section analyzes supported patterns such as:

- Trends
- Anomalies
- Correlations
- Forecasts
- Segmentation-related observations

### 5. Ask Questions

The Chat section provides a natural-language interface over the loaded dataset.

Example:

```text
What is the total revenue?
```

The query engine can return text answers, tables, and charts depending on the query.

### 6. Generate a Report

Select report sections and generate a PDF containing the selected analytical information.

## 📊 Analytics Engines

### `csvParser.ts`
Parses uploaded CSV data and builds the dataset representation used throughout the application.

### `kpiEngine.ts`
Generates KPI candidates and calculates metric values from the dataset.

### `insightsEngine.ts`
Analyzes the dataset for supported statistical patterns and generates structured insights.

### `queryEngine.ts`
Interprets supported natural-language questions and maps them to operations over the dataset.

### `reportEngine.ts`
Builds report data and supports report generation.

## 📐 Statistical Analysis

The application uses statistical libraries for analytical functionality.

### Simple Statistics
Supports statistical calculations such as descriptive statistics and correlation-related analysis.

### Regression
Supports regression-based analysis and forecasting functionality.

These calculations are performed locally in the browser after the dataset has been uploaded.

## 📄 PDF Reports

Reports are generated client-side using:

- `jsPDF`
- `jspdf-autotable`
- `html2canvas`

This allows analytical results to be exported without requiring a project backend.

## 🔐 Privacy Model

The core analytics workflow is client-side. Uploaded CSV data is processed within the application rather than being sent to a project backend.

Users should still avoid uploading confidential or sensitive information to any public deployment unless its data-handling practices have been reviewed.

## 🎨 UI Design

The application uses a dark analytics-focused interface with:

- Persistent sidebar navigation
- Sticky header
- KPI cards
- Interactive charts
- Insight cards
- Natural-language chat
- Dataset-quality workflow
- Responsive layouts
- Consistent visual hierarchy

Main navigation:

```text
Upload
Dashboard
Insights
Chat
Report
```

## ⚡ Performance Considerations

Because processing happens in the browser, performance depends on the size and complexity of the uploaded dataset.

The application is best suited to interactive analysis of reasonably sized CSV files.

For larger datasets, possible improvements include:

- Web Workers
- Streaming CSV parsing
- Server-side processing
- Incremental aggregation
- Database-backed analytics

## 🔮 Future Improvements

- LLM-powered conversational analytics
- AI-generated explanations for statistical findings
- More advanced anomaly detection
- Additional forecasting models
- Saved datasets and analysis sessions
- Dashboard customization
- Additional chart types
- Excel/CSV exports
- Shareable reports
- User authentication
- Server-side processing for large datasets
- Web Worker-based background analytics
- Dataset comparison across uploads

## 📌 Project Status

The application is implemented as a client-side analytics platform with:

- CSV ingestion
- Dataset profiling
- KPI generation
- Interactive analytics
- Automated insights
- Natural-language querying
- Forecasting/statistical analysis
- PDF report generation

