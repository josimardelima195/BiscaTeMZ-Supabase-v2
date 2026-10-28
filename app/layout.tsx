import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Djoba Já", description: "Serviços confiáveis em Moçambique · Djoba Já" };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-MZ"><body>{children}</body></html>; }
