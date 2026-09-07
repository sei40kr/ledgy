import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deployed to Firebase Hosting as a static export, keeping the stack serverless.
  // Only the production build exports: `next dev` must stay a normal server so
  // that `/fiscal-years/<id>/...` renders for any runtime ID. Under `export`,
  // dynamic segments are limited to the placeholder in generateStaticParams,
  // and Firebase Hosting rewrites map real IDs onto that shell (see firebase.json).
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: [
    "@account-ledgers/domain",
    "@account-ledgers/usecases",
    "@account-ledgers/infrastructure",
  ],
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
  },
};

export default nextConfig;
