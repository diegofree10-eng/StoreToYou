"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export const PALETA_LIGHT = {
  bgApp: "#f8fafc",
  bgCard: "#ffffff",
  textMain: "#1e293b",
  textSec: "#64748b",
  border: "#e2e8f0",
  inputBg: "#ffffff",
  primary: "#2563eb"
};
export const PALETA_DARK = {
  bgApp: "#0f172a",
  bgCard: "#1e293b",
  textMain: "#f1f5f9",
  textSec: "#94a3b8",
  border: "#334155",
  inputBg: "#1e293b",
  primary: "#3b82f6"
};

const ThemeContext = createContext<any>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isModoNoturno, setIsModoNoturno] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};

    // Escuta a autenticação para pegar o ID do lojista
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        // Escuta em tempo real o documento do lojista no Firestore
        // Isso garante que se você mudar o status no painel, o contexto atualiza
        unsubscribe = onSnapshot(doc(db, "lojistas", user.uid), (snap) => {
          if (snap.exists()) {
            const dados = snap.data();
            const modo = dados?.aparencia?.isModoNoturno || false;
            setIsModoNoturno(modo);
          }
        });
      }
    });

    return () => {
      unsubAuth();
      unsubscribe();
    };
  }, []);

  const theme = useMemo(() => (isModoNoturno ? PALETA_DARK : PALETA_LIGHT), [isModoNoturno]);

  return (
    <ThemeContext.Provider value={{ isModoNoturno, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme deve ser usado dentro de um ThemeProvider");
  return context;
}