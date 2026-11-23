/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/meishi%26mendan",
        destination: "/mendan",
      },
      {
        source: "/meishi&mendan",
        destination: "/mendan",
      },
      {
        source: "/meishi-mendan",
        destination: "/mendan",
      },
      {
        source: "/meishi",
        destination: "/",
      },
    ];
  },
};

export default nextConfig;
