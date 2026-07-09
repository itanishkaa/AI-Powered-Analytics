import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ParsedDataset, KPI, Insight } from '../types';

export async function generateReport(
    dataset: ParsedDataset,
    kpis: KPI[],
    insights: Insight[]
): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    // Color palette
    const primary = [99, 102, 241] as const;     // indigo
    const dark = [15, 23, 42] as const;          // slate-900
    const gray = [100, 116, 139] as const;       // slate-500
    const white = [255, 255, 255] as const;

    // ── Cover Page ─────────────────────────────────────────
    doc.setFillColor(...dark);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Gradient accent bar
    doc.setFillColor(...primary);
    doc.rect(0, 0, 6, pageHeight, 'F');

    doc.setTextColor(...white);
    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.text('Analytics Report', margin + 10, 80);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(dataset.fileName, margin + 10, 100);

    doc.setFontSize(12);
    doc.text(`${dataset.schema.rowCount.toLocaleString()} records · ${dataset.schema.columns.length} columns`, margin + 10, 115);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin + 10, 130);

    doc.setFillColor(...primary);
    doc.roundedRect(margin + 10, 150, 60, 10, 2, 2, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(10);
    doc.text('AI-Powered Analytics', margin + 15, 157);

    // ── Executive Summary ─────────────────────────────────
    doc.addPage();
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    doc.setFillColor(...primary);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', margin, 27);

    let yPos = 55;

    // Top KPIs
    doc.setTextColor(...dark);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Performance Indicators', margin, yPos);
    yPos += 10;

    const acceptedKpis = kpis.filter(k => k.accepted).slice(0, 8);
    const kpiTableData = acceptedKpis.map(kpi => {
        const changeStr = kpi.change !== undefined
            ? `${kpi.change > 0 ? '↑' : '↓'} ${Math.abs(kpi.change).toFixed(1)}%`
            : '–';
        return [kpi.name, kpi.formattedValue, changeStr];
    });

    autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value', 'Change']],
        body: kpiTableData,
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [...primary], textColor: [...white], fontStyle: 'bold', fontSize: 10 },
        bodyStyles: { fontSize: 10, textColor: [...dark] },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        theme: 'grid',
        styles: { cellPadding: 4, lineColor: [226, 232, 240], lineWidth: 0.2 },
    });

    // @ts-expect-error - jspdf-autotable types
    yPos = doc.lastAutoTable.finalY + 15;

    // Top Insights
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Top AI Insights', margin, yPos);
    yPos += 8;

    const topInsights = insights.slice(0, 5);
    for (const insight of topInsights) {
        if (yPos > pageHeight - 40) {
            doc.addPage();
            doc.setFillColor(248, 250, 252);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            yPos = margin;
        }

        const icon = insight.type === 'trend' ? '📈' : insight.type === 'anomaly' ? '⚠' : insight.type === 'correlation' ? '🔗' : insight.type === 'forecast' ? '🔮' : '📊';

        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, yPos, contentWidth, 22, 2, 2, 'FD');
        doc.setDrawColor(226, 232, 240);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...dark);
        doc.text(`${icon} ${insight.headline}`, margin + 4, yPos + 8);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...gray);
        doc.setFontSize(9);
        doc.text(insight.metric, margin + 4, yPos + 16);

        // Confidence badge
        const badgeColor = insight.confidence === 'high' ? [34, 197, 94] : insight.confidence === 'medium' ? [234, 179, 8] : [239, 68, 68];
        doc.setFillColor(...(badgeColor as [number, number, number]));
        const badgeX = pageWidth - margin - 22;
        doc.roundedRect(badgeX, yPos + 3, 18, 6, 1, 1, 'F');
        doc.setTextColor(...white);
        doc.setFontSize(7);
        doc.text(insight.confidence.toUpperCase(), badgeX + 2, yPos + 7.5);

        yPos += 28;
    }

    // ── Data Schema Appendix ───────────────────────────────
    doc.addPage();
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    doc.setFillColor(...primary);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Appendix: Data Schema', margin, 27);

    const schemaData = dataset.schema.columns.map(col => [
        col.name,
        col.type.charAt(0).toUpperCase() + col.type.slice(1),
        col.uniqueCount.toString(),
        `${col.missingPercent.toFixed(1)}%`,
        col.sampleValues.slice(0, 2).join(', '),
    ]);

    autoTable(doc, {
        startY: 50,
        head: [['Column', 'Type', 'Unique', 'Missing %', 'Sample']],
        body: schemaData,
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [...primary], textColor: [...white], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: [...dark] },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        theme: 'grid',
        styles: { cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.2 },
    });

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...gray);
        doc.text(`AI Analytics Report · ${dataset.fileName} · Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    // Save
    doc.save(`${dataset.fileName.replace('.csv', '')}_report.pdf`);
}
