/** @type {import('next').NextConfig} */
const nextConfig = {
	eslint: {
		// Keep linting in editor/CI, but don't block deployment bundles.
		ignoreDuringBuilds: true,
	},
};

export default nextConfig;
