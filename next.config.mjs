/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Server Actions são estáveis no Next 15; nada extra necessário.
  },
  images: {
    remotePatterns: [
      // Ajuste conforme o domínio do seu projeto Supabase Storage.
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
