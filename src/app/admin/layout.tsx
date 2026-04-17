'use client';

import { AdminGuard } from '@/components/AdminGuard';
import { useAuth } from '@/lib/authContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import './admin.css';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: '⬛' },
  { href: '/admin/upload', label: 'Upload PDF', icon: '📤' },
  { href: '/admin/documents', label: 'Documents', icon: '📁' },
  { href: '/admin/provisions', label: 'Provisions', icon: '⚖️' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📊' },
];

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-mode-badge">ADMIN MODE</div>
          <div className="admin-brand">Niyam AI</div>
          <div className="admin-user-info">
            <span className="admin-user-email">{user?.email}</span>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav-item ${pathname === item.href ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <Link href="/dashboard" className="admin-nav-item">
            <span className="admin-nav-icon">👤</span>
            <span>User View</span>
          </Link>
          <button onClick={logout} className="admin-nav-item admin-logout-btn">
            <span className="admin-nav-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <main className="admin-main">
        <div className="admin-topbar">
          <button
            className="admin-hamburger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <div className="admin-topbar-badge">
            <span className="admin-mode-dot" /> ADMIN MODE
          </div>
        </div>
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <AdminLayout>{children}</AdminLayout>
    </AdminGuard>
  );
}
