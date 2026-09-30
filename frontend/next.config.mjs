/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // react-pdf / pdf.js ไม่ต้องใช้ canvas ของ Node ตอนรันใน browser
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
