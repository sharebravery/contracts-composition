/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@onchain-contract-lab/chain-config',
    '@onchain-contract-lab/contract-registry',
    '@onchain-contract-lab/ui',
    '@onchain-contract-lab/web3-react',
  ],
};

export default nextConfig;
