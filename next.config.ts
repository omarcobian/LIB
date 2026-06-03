import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['xlsx', 'pdf-parse', 'tesseract.js'],
};

export default nextConfig;
