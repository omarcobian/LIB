import { spawnSync } from 'node:child_process';

const commands = [
  ['pdftocairo', ['-v']],
  ['pdftoppm', ['-v']],
];

const found = commands.some(([cmd, args]) => {
  const res = spawnSync(cmd, args, { stdio: 'ignore' });
  return res.status === 0;
});

if (!found) {
  console.error(
    '❌ No se encontró Poppler (pdftocairo/pdftoppm) en PATH. Instálalo para habilitar OCR de PDFs escaneados.'
  );
  process.exit(1);
}

console.log('✅ Dependencia OCR detectada: Poppler disponible.');
