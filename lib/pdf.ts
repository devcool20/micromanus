import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/utils/supabase/admin';

// Apply fs patch to redirect virtual C:\ROOT paths from Turbopack to the actual workspace directory
const originalReadFileSync = fs.readFileSync;
fs.readFileSync = function (this: any, filePath: any, options?: any) {
  if (typeof filePath === 'string' && filePath.toLowerCase().endsWith('.afm')) {
    const fileName = path.basename(filePath);
    const correctedPath = path.join(process.cwd(), 'node_modules', 'pdfkit', 'js', 'data', fileName);
    console.log(`[FS PATCH] Redirecting AFM path: "${filePath}" -> "${correctedPath}"`);
    return originalReadFileSync.call(this, correctedPath, options);
  }
  return originalReadFileSync.call(this, filePath, options);
} as any;

// Dynamically import/require PDFDocument so it resolves its fs reference AFTER the patch is applied
const PDFDocument = require('pdfkit').default || require('pdfkit');

let regularFontBuffer: Buffer | null = null;
let boldFontBuffer: Buffer | null = null;

async function getFontBuffers() {
  if (regularFontBuffer && boldFontBuffer) {
    return { regular: regularFontBuffer, bold: boldFontBuffer };
  }

  const fontsDir = path.join(process.cwd(), 'public', 'fonts');
  const regPath = path.join(fontsDir, 'Roboto-Regular.ttf');
  const boldPath = path.join(fontsDir, 'Roboto-Bold.ttf');

  try {
    if (fs.existsSync(regPath) && fs.existsSync(boldPath)) {
      regularFontBuffer = fs.readFileSync(regPath);
      boldFontBuffer = fs.readFileSync(boldPath);
      return { regular: regularFontBuffer, bold: boldFontBuffer };
    }
  } catch (e) {
    console.log('Local font check failed, falling back to download:', e);
  }

  // Fallback to verified cdnjs pdfmake Roboto TTF files
  const regularUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';
  const boldUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf';

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  const [regRes, boldRes] = await Promise.all([
    fetch(regularUrl, { headers }),
    fetch(boldUrl, { headers })
  ]);

  const regBuffer = Buffer.from(await regRes.arrayBuffer());
  const boldBuffer = Buffer.from(await boldRes.arrayBuffer());

  regularFontBuffer = regBuffer;
  boldFontBuffer = boldBuffer;

  // Try to cache locally for subsequent runs
  try {
    if (!fs.existsSync(fontsDir)) {
      fs.mkdirSync(fontsDir, { recursive: true });
    }
    fs.writeFileSync(regPath, regBuffer);
    fs.writeFileSync(boldPath, boldBuffer);
  } catch (e) {
    console.log('Could not save fonts to disk (safe to ignore on read-only environments):', e);
  }

  return { regular: regBuffer, bold: boldBuffer };
}

export async function generatePdfReport(chatId: string, title: string, markdownContent: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const { regular, bold } = await getFontBuffers();

      // CRITICAL: autoFirstPage: false prevents the constructor from calling
      // this.font('Helvetica') which tries to load Helvetica.afm from disk.
      // We register our font aliases FIRST, then manually add the first page.
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        autoFirstPage: false,
      });
      
      doc.registerFont('Roboto-Regular', regular);
      doc.registerFont('Roboto-Bold', bold);
      
      // Alias default Helvetica fonts to Roboto to completely block disk AFM lookups
      doc.registerFont('Helvetica', regular);
      doc.registerFont('Helvetica-Bold', bold);
      doc.registerFont('Helvetica-Oblique', regular);
      doc.registerFont('Helvetica-BoldOblique', bold);
      
      // NOW add the first page — Helvetica is already aliased so no AFM lookup occurs
      doc.addPage();
      
      const chunks: any[] = [];
      doc.on('data', (chunk: any) => chunks.push(chunk));
      
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          
          // Upload to Supabase Storage
          const adminSupabase = createAdminClient();
          
          // Ensure bucket exists (ignore error if it already exists)
          const { error: bucketError } = await adminSupabase.storage.createBucket('artifacts', {
            public: true,
          });
          
          if (bucketError && !bucketError.message.includes('already exists') && !bucketError.message.includes('duplicate')) {
            console.log('Artifacts bucket creation detail (safe to ignore if exists):', bucketError.message);
          }
          
          const fileName = `${chatId}/report-${Date.now()}.pdf`;
          
          const { error: uploadError } = await adminSupabase.storage
            .from('artifacts')
            .upload(fileName, pdfBuffer, {
              contentType: 'application/pdf',
              cacheControl: '3600',
              upsert: true,
            });
            
          if (uploadError) {
            throw uploadError;
          }
          
          const { data } = adminSupabase.storage
            .from('artifacts')
            .getPublicUrl(fileName);
            
          resolve(data.publicUrl);
        } catch (uploadErr) {
          reject(uploadErr);
        }
      });
      
      // Page styling & content rendering
      // Header Page / Title Block
      doc.fillColor('#0f172a').fontSize(24).font('Roboto-Bold').text(title);
      doc.moveDown(0.5);
      
      // Timestamp / Subtitle
      doc.fillColor('#64748b').fontSize(10).font('Roboto-Regular').text(`Generated by MicroManus Research Agent on ${new Date().toLocaleDateString()}`);
      doc.moveDown(1);
      
      // Horizontal separator
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1.5);
      
      // Simple Markdown rendering line by line
      const lines = markdownContent.split('\n');
      doc.fillColor('#334155').fontSize(11).font('Roboto-Regular');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('### ')) {
          doc.moveDown(0.8);
          doc.fillColor('#1e293b').fontSize(13).font('Roboto-Bold').text(trimmed.slice(4));
          doc.moveDown(0.4);
          doc.fillColor('#334155').fontSize(11).font('Roboto-Regular');
        } else if (trimmed.startsWith('## ')) {
          doc.moveDown(1);
          doc.fillColor('#0f172a').fontSize(15).font('Roboto-Bold').text(trimmed.slice(3));
          doc.moveDown(0.5);
          doc.fillColor('#334155').fontSize(11).font('Roboto-Regular');
        } else if (trimmed.startsWith('# ')) {
          doc.moveDown(1.2);
          doc.fillColor('#0f172a').fontSize(18).font('Roboto-Bold').text(trimmed.slice(2));
          doc.moveDown(0.6);
          doc.fillColor('#334155').fontSize(11).font('Roboto-Regular');
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const bulletContent = trimmed.slice(2);
          doc.text(`•  ${bulletContent.replace(/\*\*([\s\S]*?)\*\*/g, '$1')}`, { indent: 15 });
          doc.moveDown(0.2);
        } else if (/^\d+\.\s/.test(trimmed)) {
          const textContent = trimmed.replace(/\*\*([\s\S]*?)\*\*/g, '$1');
          doc.text(textContent, { indent: 15 });
          doc.moveDown(0.2);
        } else if (trimmed === '') {
          doc.moveDown(0.4);
        } else {
          // Regular text paragraph
          const cleanText = trimmed.replace(/\*\*([\s\S]*?)\*\*/g, '$1');
          doc.text(cleanText, { align: 'justify' });
          doc.moveDown(0.4);
        }
      }
      
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
export async function updateChatArtifactUrl(chatId: string, url: string) {
  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from('chats')
    .update({ artifact_url: url })
    .eq('id', chatId);
    
  if (error) {
    console.error(`Failed to save chat artifact_url for chat ${chatId}:`, error);
  }
}
