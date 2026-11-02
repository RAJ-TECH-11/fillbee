import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Hindi font file server ke saath deploy ho (fs se padhi jaati hai).
  outputFileTracingIncludes: {
    "/forms": ["./assets/fonts/**/*"],
    "/forms/**": ["./assets/fonts/**/*"],
    "/api/forms/**": ["./assets/fonts/**/*"],
  },
  experimental: {
    // Admin PDF upload server action se hota hai (default limit 1 MB).
    // PDF max 4 MB hai, form ki baaki details ke liye thodi jagah extra.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  partialPrefetching: true,
  // Har page par basic security headers.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Doosri websites hamare pages ko iframe mein nahi dikha sakti (clickjacking se bachav).
          // Apna PDF preview same site ka hai, isliye wo chalta rahega.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self'" },
          // Browser file ka type khud andaza na lagaye.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Doosri site par jaate waqt poora URL (jisme form id ho sakti hai) na bheje.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Live site hamesha HTTPS par khule.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
