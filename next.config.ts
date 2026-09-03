import type { NextConfig } from "next";
import path from "node:path";
const config: NextConfig = { experimental: { serverActions: { bodySizeLimit: "10mb" } }, turbopack: { root: path.resolve(__dirname) } };
export default config;
