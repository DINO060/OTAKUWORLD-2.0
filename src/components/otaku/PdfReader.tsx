import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader, ZoomIn, ZoomOut } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfReaderProps {
  url: string;
  onNextChapter?: () => void;
  nextChapterLabel?: string;
}

function PdfPage({ pdf, pageNum, scale }: { pdf: pdfjsLib.PDFDocumentProxy; pageNum: number; scale: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    (async () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      try {
        const page = await pdf.getPage(pageNum);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        const task = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch (e: any) {
        if (e?.name === 'RenderingCancelledException') return;
      }
    })();

    return () => { cancelled = true; };
  }, [pdf, pageNum, scale]);

  return (
    <div className="w-full flex justify-center mb-1">
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          maxWidth: '100%',
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  );
}

export function PdfReader({ url, onNextChapter, nextChapterLabel }: PdfReaderProps) {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.4);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPdf(null);

    pdfjsLib.getDocument({ url, withCredentials: false }).promise
      .then(doc => {
        setPdf(doc);
        setTotalPages(doc.numPages);
        setLoading(false);
      })
      .catch(() => {
        setError('Impossible de charger le PDF');
        setLoading(false);
      });
  }, [url]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader size={32} className="animate-spin" style={{ color: '#6c5ce7' }} />
    </div>
  );

  if (error) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <span style={{ fontSize: '48px' }}>📄</span>
        <p className="mt-3" style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>{error}</p>
        <p className="mt-1" style={{ fontSize: '13px', color: '#8888a0' }}>Vérifiez que le serveur streaming est actif</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Zoom toolbar */}
      <div
        className="flex items-center justify-end gap-2 px-4 py-2 flex-shrink-0"
        style={{ background: '#1a1a28', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <button
          onClick={() => setScale(s => Math.max(s - 0.2, 0.6))}
          className="p-1.5 rounded-lg hover:bg-[#2a2a3e] transition-colors"
        >
          <ZoomOut size={18} style={{ color: '#8888a0' }} />
        </button>
        <span style={{ fontSize: '12px', color: '#8888a0', minWidth: '42px', textAlign: 'center' }}>
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale(s => Math.min(s + 0.2, 3))}
          className="p-1.5 rounded-lg hover:bg-[#2a2a3e] transition-colors"
        >
          <ZoomIn size={18} style={{ color: '#8888a0' }} />
        </button>
      </div>

      {/* All pages scrollable */}
      <div className="flex-1 overflow-y-auto" style={{ background: '#0c0c14' }}>
        <div className="py-2">
          {pdf && Array.from({ length: totalPages }, (_, i) => (
            <PdfPage key={`${url}-${i + 1}-${scale}`} pdf={pdf} pageNum={i + 1} scale={scale} />
          ))}
        </div>

        {/* End of chapter */}
        {pdf && (
          <div className="text-center py-8">
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed', marginBottom: '8px' }}>
              Fin du chapitre
            </p>
            <p style={{ fontSize: '13px', color: '#8888a0' }}>{totalPages} pages</p>
            {onNextChapter && (
              <button
                onClick={onNextChapter}
                className="mt-4 px-6 py-2.5 rounded-xl"
                style={{ background: '#6c5ce7', fontSize: '13px', fontWeight: 700, color: '#ffffff' }}
              >
                {nextChapterLabel || 'Chapitre suivant →'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
