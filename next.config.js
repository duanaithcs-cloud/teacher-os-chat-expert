/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // JSON lớn trong src/data được import ở server-side (route handler) và
  // Next tự tree-shake khỏi client bundle. Không cần serverExternalPackages
  // (key này chỉ hợp lệ từ Next 15, gây warning trên Next 14).
  experimental: {
    // Giữ nguyên mặc định; chỗ này để trống có chủ đích.
  },
};

module.exports = nextConfig;
