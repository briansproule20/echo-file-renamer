import { NextRequest, NextResponse } from 'next/server';

interface ExportItem {
  originalName: string;
  finalName: string;
  confidence: number;
  rationale: string;
}

export async function POST(req: NextRequest) {
  try {
    const { items } = (await req.json()) as { items: ExportItem[] };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    // Generate CSV
    const headers = ['Original Name', 'New Name', 'Confidence', 'Rationale'];
    const rows = items.map((item) => [
      item.originalName,
      item.finalName,
      item.confidence.toFixed(2),
      item.rationale.replace(/"/g, '""'), // Escape quotes
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const fileName = `renaming-map-${Date.now()}.csv`;

    // Return CSV as response
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Export CSV error:', error);
    return NextResponse.json({ error: 'Failed to export CSV' }, { status: 500 });
  }
}

