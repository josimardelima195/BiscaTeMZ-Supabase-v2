import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "BiscaTeMZ", description: "Serviços confiáveis em Moçambique" };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-MZ"><body>{children}</body></html>; }
