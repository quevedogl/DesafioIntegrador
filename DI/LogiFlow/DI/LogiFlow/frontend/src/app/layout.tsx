import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LogiFlow Analytics",
  description: "Distribuidora de Materiais de Construção — Gestão Inteligente",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full flex flex-col bg-gray-100">{children}</body>
    </html>
  );
}
