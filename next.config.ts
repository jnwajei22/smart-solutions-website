import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    // Preview QA embeds only this same origin; production remains unframeable.
    const previewFrames =
      process.env.VERCEL_ENV === "preview" ||
      process.env.NODE_ENV === "development";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "X-Frame-Options",
            value: previewFrames ? "SAMEORIGIN" : "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${previewFrames ? "'self'" : "'none'"}; base-uri 'self'; object-src 'none'`,
          },
        ],
      },
    ];
  },
};
export default nextConfig;
