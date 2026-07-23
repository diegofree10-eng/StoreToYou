// app/[lojista]/_components/LojaContext.tsx
"use client";

import { createContext, useContext } from "react";

interface LojaContextType {
  dadosLoja: any;
  isLojaAberta: boolean;
}

const LojaContext = createContext<LojaContextType>({
  dadosLoja: {},
  isLojaAberta: true,
});

export function LojaProvider({ children, dadosLoja }: { children: React.ReactNode; dadosLoja: any }) {
  // Lê a flag de funcionamento de dentro do objeto 'sistema' no Firestore
  const isLojaAberta = dadosLoja?.sistema?.isLojaAberta !== false;

  return (
    <LojaContext.Provider value={{ dadosLoja, isLojaAberta }}>
      {children}
    </LojaContext.Provider>
  );
}

export const useLoja = () => useContext(LojaContext);