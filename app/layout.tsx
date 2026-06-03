import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { BookOpen, Users, Settings, BarChart3 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cambio de Malla Curricular',
  description: 'Administración de cambios de plan de estudios',
};

const nav = [
  { href: '/', label: 'Dashboard', icon: BarChart3 },
  { href: '/alumnos', label: 'Alumnos', icon: Users },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif" }}>
        <div className="flex min-h-screen">
          <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500 flex items-center justify-center">
                  <BookOpen size={18} className="text-slate-950" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-100 leading-tight">Cambio de</p>
                  <p className="font-bold text-sm text-cyan-400 leading-tight">Malla Curricular</p>
                </div>
              </div>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {nav.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors text-sm font-medium group">
                  <Icon size={16} className="group-hover:text-cyan-400 transition-colors" />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-slate-800">
              <p className="text-xs text-slate-600">Sistema local · Uso interno</p>
            </div>
          </aside>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
