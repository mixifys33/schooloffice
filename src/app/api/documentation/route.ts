import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file');

    if (file) {
      // Get specific file content
      const filePath = path.join(process.cwd(), 'documentations', file);
      
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return NextResponse.json({ content, filename: file });
    } else {
      // List all markdown files
      const docsDir = path.join(process.cwd(), 'documentations');
      const files = fs.readdirSync(docsDir)
        .filter(file => file.endsWith('.md'))
        .map(file => ({
          name: file,
          title: file.replace('.md', '').replace(/-/g, ' '),
        }));

      return NextResponse.json({ files });
    }
  } catch (error) {
    console.error('Documentation API error:', error);
    return NextResponse.json({ error: 'Failed to fetch documentation' }, { status: 500 });
  }
}
