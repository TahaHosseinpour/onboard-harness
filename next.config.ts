import type { NextConfig } from 'next';

// The desktop preview loads a static export through Electron's app:// protocol.
const isDesktopExport = process.env.DESKTOP_EXPORT === '1';

const nextConfig: NextConfig = {
  ...(isDesktopExport ? { output: 'export' as const, images: { unoptimized: true } } : {}),
  devIndicators: false,
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react'],
  },
};

export default nextConfig;
