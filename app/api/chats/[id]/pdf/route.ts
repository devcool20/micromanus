import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generatePdfReport, updateChatArtifactUrl } from '@/lib/pdf';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { markdownContent, title } = await request.json();

    if (!markdownContent) {
      return NextResponse.json({ error: 'markdownContent is required' }, { status: 400 });
    }

    const reportTitle = title || 'MicroManus Research Report';
    
    // Compile and upload PDF
    const pdfUrl = await generatePdfReport(id, reportTitle, markdownContent);
    
    // Save PDF url to chat thread
    await updateChatArtifactUrl(id, pdfUrl);

    return NextResponse.json({ url: pdfUrl });
  } catch (err: any) {
    console.error('Manual PDF Generation Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
