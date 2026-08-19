"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
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
    let unsubscribeLoja = () => {};

    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // 1. Descobre o ID real da loja (tratando se o UID for da collection usuarios ou lojistas)
          let lojaIdReal = user.uid;
          const userSnap = await getDoc(doc(db, "usuarios", user.uid));
          if (userSnap.exists() && userSnap.data().lojaId) {
            lojaIdReal = userSnap.data().lojaId;
          }

          // 2. Escuta em tempo real o documento correto do lojista no Firestore
          unsubscribeLoja = onSnapshot(doc(db, "lojistas", lojaIdReal), (snap) => {
            if (snap.exists()) {
              const dados = snap.data();
              const modo = dados?.aparencia?.isModoNoturno || false;
              setIsModoNoturno(modo);
            }
          });
        } catch (error) {
          console.error("Erro ao carregar tema do lojista:", error);
        }
      }
    });

    return () => {
      unsubAuth();
      unsubscribeLoja();
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