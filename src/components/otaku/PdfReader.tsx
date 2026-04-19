import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfReaderProps {
  url: string;
  onNextChapter?: () => void;
  nextChapterLabel?: string;
}

export function PdfReader({ url, onNextChapter, nextChapterLabel }: PdfReaderProps) {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPdf(null);
    setCurrentPage(1);

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

  const renderPage = useCallback(async (pageNum: number, pdfDoc: pdfjsLib.PDFDocumentProxy, zoom: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    setRendering(true);
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: zoom });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const ctx = canvas.getContext('2d')!;
      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      await task.promise;
    } catch (e: any) {
      if (e?.name !== 'RenderingCancelledException') {
        setError('Erreur de rendu');
      }
    } finally {
      setRendering(false);
    }
  }, []);

  useEffect(() => {
    if (pdf) renderPage(currentPage, pdf, scale);
  }, [pdf, currentPage, scale, renderPage]);

  const goTo = (n: number) => {
    if (n < 1 || n > totalPages) return;
    setCurrentPage(n);
  };

  const zoomIn = () => setScale(s => Math.min(s + 0.2, 3));
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.6));

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
      {/* PDF Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{ background: '#1a1a28', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => goTo(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-[#2a2a3e] transition-colors"
          >
            <ChevronLeft size={18} style={{ color: '#e8e8ed' }} />
          </button>
          <span style={{ fontSize: '13px', color: '#e8e8ed', minWidth: '80px', textAlign: 'center' }}>
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => goTo(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-[#2a2a3e] transition-colors"
          >
            <ChevronRight size={18} style={{ color: '#e8e8ed' }} />
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            className="p-1.5 rounded-lg hover:bg-[#2a2a3e] transition-colors"
          >
            <ZoomOut size={18} style={{ color: '#8888a0' }} />
          </button>
          <span style={{ fontSize: '12px', color: '#8888a0', minWidth: '42px', textAlign: 'center' }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-1.5 rounded-lg hover:bg-[#2a2a3e] transition-colors"
          >
            <ZoomIn size={18} style={{ color: '#8888a0' }} />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto flex flex-col items-center py-4" style={{ background: '#0c0c14' }}>
        <div className="relative">
          {rendering && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10 }}>
              <Loader size={24} className="animate-spin" style={{ color: '#6c5ce7' }} />
            </div>
          )}
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              maxWidth: '100%',
              borderRadius: '4px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
              opacity: rendering ? 0.4 : 1,
              transition: 'opacity 0.15s',
            }}
          />
        </div>

        {/* End of chapter */}
        {currentPage === totalPages && (
          <div className="text-center py-8 mt-4">
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
