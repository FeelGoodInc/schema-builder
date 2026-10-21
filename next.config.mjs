/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  experimental: {
    proxyTimeout: 300000,
    proxyClientMaxBodySize: '500mb',
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
  },
  devIndicators: {
    position: 'bottom-right'
  },
  reactStrictMode: false,
  sassOptions: { includePaths: [path.join(__dirname, './src/styles')] },
};

export default nextConfig;
