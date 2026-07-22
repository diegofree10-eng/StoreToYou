"use client";

import React, { useState, useEffect, useRef, CSSProperties } from "react";
import dynamic from 'next/dynamic';
import { usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, orderBy, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

// Importação da lógica unificada
import { getPlanoEfetivo } from "@/utils/planoAtivo";

import Sidebar from "./Sidebar";
import { DashboardGestao } from "./DashboardCompleto";
import { DashboardBronze } from "./DashboardBasico";
import CadastroProdutos from "./produtos/page";
import Pedidos from "./pedidos/page";
import AdminConfig from "./config/page";
import DashboardMaster from "./_tabDashBoardMaster/DashboardMaster";

function AdminContent() {
  const [telaAtiva, setTelaAtiva] = useState('dash');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [dadosLojista, setDadosLojista] = useState<any>(null);
  const [planosConfig, setPlanosConfig] = useState<any>(null);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [lojistaIdReal, setLojistaIdReal] = useState<string | null>(null);

  const pathname = usePathname();
  const unsubLojaRef = useRef<(() => void) | null>(null);
  const unsubPedidosRef = useRef<(() => void) | null>(null);
  const unsubPlanosRef = useRef<(() => void) | null>(null);

  const planoEfetivo = (dadosLojista && planosConfig) ? getPlanoEfetivo(dadosLojista, planosConfig) : null;

  useEffect(() => {
    if (isLoggingOut) return;

    unsubPlanosRef.current = onSnapshot(doc(db, "configuracoes", "planos"), (snap) => {
      if (snap.exists()) setPlanosConfig(snap.data());
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (pathname !== "/login") window.location.replace("/login");
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUserRole(userData.role);
          setLojistaIdReal(userData.lojaId);

          if (userData.lojaId) {
            if (unsubLojaRef.current) unsubLojaRef.current();
            if (unsubPedidosRef.current) unsubPedidosRef.current();

            // Listener da Loja
            // Listener da Loja
            unsubLojaRef.current = onSnapshot(doc(db, "lojistas", userData.lojaId), async (snapLoja) => {
              if (snapLoja.exists()) {
                const lojaData = snapLoja.data();
                setDadosLojista(lojaData);

                const statusLoja = lojaData?.dadosLoja?.dsStatusLoja || lojaData?.status;
                if (statusLoja === "suspenso") {
                  try {
                    await signOut(auth);
                  } catch (e) {
                    // Ignora erros de sign out para não travar
                  }

                  // Força o navegador a carregar a página do zero, limpando o histórico do client router
                  window.location.replace("/atendimentoSuporte");
                  return;
                }
              }
            });

            const qPedidos = query(collection(db, "lojistas", userData.lojaId, "pedidos"), orderBy("numeroPedido", "desc"));
            unsubPedidosRef.current = onSnapshot(qPedidos, (snapPedidos) => {
              setPedidos(snapPedidos.docs.map(d => ({ id: d.id, ...d.data() })));
              setLoading(false);
            }, () => setLoading(false));
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error("Erro na carga de dados:", e);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubPlanosRef.current) unsubPlanosRef.current();
    };
  }, [pathname, isLoggingOut]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    if (unsubLojaRef.current) unsubLojaRef.current();
    if (unsubPedidosRef.current) unsubPedidosRef.current();
    if (unsubPlanosRef.current) unsubPlanosRef.current();
    try { await signOut(auth); } catch (error) { }
    window.location.replace("/login");
  };

  if (isLoggingOut || loading) return <div style={styles.loader}>Carregando sistema...</div>;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <Sidebar telaAtiva={telaAtiva} setTelaAtiva={setTelaAtiva} onLogout={handleLogout} />
      <main style={{ flex: 1, overflowY: "auto", height: "100vh", padding: "20px" }}>

        {telaAtiva === 'dash' && planoEfetivo && (
          planoEfetivo.configs.tipoDashboard === 'gestao' ? (
            <DashboardGestao pedidos={pedidos} lojistaId={lojistaIdReal || undefined} />
          ) : (
            <DashboardBronze pedidos={pedidos} dadosLojista={dadosLojista || undefined} />
          )
        )}

        {telaAtiva === 'produtos' && <CadastroProdutos />}
        {telaAtiva === 'pedidos' && lojistaIdReal && <Pedidos pedidos={pedidos} db={db} lojistaIdApp={lojistaIdReal} />}
        {telaAtiva === 'config' && <AdminConfig />}
        {telaAtiva === 'gestao-geral' && userRole === 'master' && <DashboardMaster />}

      </main>
    </div>
  );
}

const styles: { [key: string]: CSSProperties } = {
  loader: { background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'sans-serif', fontWeight: 'bold', fontSize: '16px' }
};

export default dynamic(() => Promise.resolve(AdminContent), { ssr: false });