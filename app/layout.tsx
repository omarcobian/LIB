import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema de Equivalencias de Plan de Estudios",
  description: "Gestión de equivalencias entre plan antiguo y nuevo",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <main className="mx-auto min-h-screen max-w-6xl p-6">{children}</main>
      </body>
    </html>
  );
}
