// app/admin/layout.tsx
"use client";

import React from "react";
// 🌟 1. Importe o ThemeProvider do seu contexto global
import { ThemeProvider } from "@/context/ThemeContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    // 🌟 2. Envolva os filhos com o ThemeProvider
    <ThemeProvider>
      <div className="admin-container" style={{ margin: 0, padding: 0, minHeight: "100vh" }}>
        {children}
      </div>
    </ThemeProvider>
  );
}