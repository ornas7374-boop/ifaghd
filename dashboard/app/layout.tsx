import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Sales Automation",
  description: "Personal sales automation dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <span className="brand">Sales Automation</span>
          <a href="/">Dashboard</a>
          <a href="/leads">Leads</a>
          <a href="/leads/new">+ New Lead</a>
          <a href="/leads/import">Import CSV</a>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
