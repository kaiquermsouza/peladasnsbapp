import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev'

/** @type {import('next').NextConfig} */
const nextConfig = {}

// Setup Cloudflare platform bindings in development
if (process.env.NODE_ENV === 'development') {
  try {
    await setupDevPlatform()
  } catch {
    // silently ignore if not available locally
  }
}

export default nextConfig
