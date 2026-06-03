import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPdfTextWithStrategy } from '../lib/pdf-parser';

const dummyPdf = Buffer.from('%PDF-1.4\n%mock');

test('PDF con texto embebido usa estrategia embedded_text sin OCR', async () => {
  let ocrCalls = 0;
  const result = await extractPdfTextWithStrategy(dummyPdf, {
    extractTextPreserveLayout: async () => 'KARDEX ALUMNO MATRICULA 2021001 MATERIA CALIFICACION CREDITOS',
    extractTextSimple: async () => null,
    analyzePages: async () => ({
      pageCount: 2,
      pages: [
        { pageNumber: 1, extractedText: 'Kardex alumno créditos', hasText: true, hasImage: true },
        { pageNumber: 2, extractedText: 'Materia cálculo calificación 9', hasText: true, hasImage: false },
      ],
      errors: [],
    }),
    ocrPdf: async () => {
      ocrCalls += 1;
      return { text: 'texto OCR', pagesProcessed: 2 };
    },
  });

  assert.equal(result.strategyUsed, 'embedded_text');
  assert.equal(result.hasText, true);
  assert.equal(result.textCoverage, 1);
  assert.equal(ocrCalls, 0);
});

test('PDF escaneado cae a OCR cuando no hay texto embebido', async () => {
  let ocrCalls = 0;
  const result = await extractPdfTextWithStrategy(dummyPdf, {
    extractTextPreserveLayout: async () => '',
    extractTextSimple: async () => null,
    analyzePages: async () => ({
      pageCount: 3,
      pages: [
        { pageNumber: 1, extractedText: '', hasText: false, hasImage: true },
        { pageNumber: 2, extractedText: '', hasText: false, hasImage: true },
        { pageNumber: 3, extractedText: '', hasText: false, hasImage: true },
      ],
      errors: [],
    }),
    ocrPdf: async () => {
      ocrCalls += 1;
      return { text: 'KARDEX MATRICULA 2021002 MATERIA PROGRAMACION CALIFICACION 8', pagesProcessed: 3 };
    },
  });

  assert.equal(result.strategyUsed, 'ocr');
  assert.equal(result.hasText, true);
  assert.equal(result.textCoverage, 0);
  assert.equal(result.diagnostics.imageBased, true);
  assert.equal(ocrCalls, 1);
});

test('PDF mixto se clasifica como hybrid y conserva texto embebido', async () => {
  let ocrCalls = 0;
  const result = await extractPdfTextWithStrategy(dummyPdf, {
    extractTextPreserveLayout: async () => 'KARDEX MATRICULA 2021999 MATERIA REDES CALIFICACION 10 CREDITOS',
    extractTextSimple: async () => 'KARDEX MATRICULA 2021999 MATERIA REDES CALIFICACION 10 CREDITOS',
    analyzePages: async () => ({
      pageCount: 4,
      pages: [
        { pageNumber: 1, extractedText: 'Kardex alumno', hasText: true, hasImage: false },
        { pageNumber: 2, extractedText: '', hasText: false, hasImage: true },
        { pageNumber: 3, extractedText: 'Materia redes 10', hasText: true, hasImage: true },
        { pageNumber: 4, extractedText: '', hasText: false, hasImage: true },
      ],
      errors: [],
    }),
    ocrPdf: async () => {
      ocrCalls += 1;
      return { text: 'texto OCR mixto', pagesProcessed: 2 };
    },
  });

  assert.equal(result.strategyUsed, 'hybrid');
  assert.equal(result.hasText, true);
  assert.equal(result.textCoverage, 0.5);
  assert.match(result.extractedText, /KARDEX/i);
  assert.equal(ocrCalls, 0);
});
