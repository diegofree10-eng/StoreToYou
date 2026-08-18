"use client";
import React, { useEffect, useState, useMemo } from "react";
import { FiPieChart, FiPackage, FiShoppingCart, FiSettings, FiLogOut, FiShield, FiX, FiArchive, FiDollarSign } from "react-icons/fi";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, getDoc, updateDoc } from "firebase/firestore";

interface SidebarProps {
  telaAtiva: string;
  setTelaAtiva?: (tela: string) => void;
  onLogout: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  planoEfetivo?: any;
  masterLiberou?: (feature: string) => boolean;
}

export default function Sidebar({ telaAtiva, setTelaAtiva, onLogout, isOpenMobile, onCloseMobile, planoEfetivo, masterLiberou }: SidebarProps) {
  const [role, setRole] = useState<string | null>(null);
  const [lojistaId, setLojistaId] = useState<string | null>(null);
  const [novosPedidosCount, setNovosPedidosCount] = useState<number>(0);
  const [dadosLoja, setDadosLoja] = useState({
    nomeLoja: "Carregando...",
    logoUrl: null
  });

  const unsubRef = React.useRef<(() => void) | null>(null);

  // 1. Autenticação e carregamento dos dados do lojista
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));

        if (!userDoc.exists()) return;

        const userData = userDoc.data();
        setRole(userData.role);

        const lojaIdReal = userData.lojaId;
        if (!lojaIdReal) return;

        setLojistaId(lojaIdReal);

        const docRef = doc(db, "lojistas", lojaIdReal);

        if (unsubRef.current) unsubRef.current();

        unsubRef.current = onSnapshot(docRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const dados = data.dadosLoja || data;

            const statusAtual = dados.dsStatusLoja || 'ativo';
            const nomeLoja = dados.dsNomeLoja || "Minha Loja";
            const logoUrl = dados.dsLogoLoja || null;
            const tsVencimento = dados.tsVencimentoLoja?.toDate();
            const now = new Date();

            if (tsVencimento && now > tsVencimento && statusAtual === 'ativo') {
              await updateDoc(docRef, { "dadosLoja.dsStatusLoja": 'suspenso' });
              window.location.replace("/atendimentoSuporte");
              return;
            }

            if (statusAtual === 'suspenso') {
              window.location.replace("/atendimentoSuporte");
              return;
            }

            setDadosLoja({ nomeLoja, logoUrl });
          }
        }, (error) => {
          console.warn("Aviso de permissão temporária na Sidebar:", error);
        });

      } catch (error) {
        console.error("Erro na sidebar:", error);
      }
    });

    return () => {
      unsubAuth();
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  // 2. Leitura leve do localStorage para sincronizar o contador em tempo real
  useEffect(() => {
    if (!lojistaId) return;

    const lerContadorLocalStorage = () => {
      const valorSalvo = localStorage.getItem(`contador_novos_pedidos_${lojistaId}`);
      setNovosPedidosCount(valorSalvo ? Number(valorSalvo) : 0);
    };

    lerContadorLocalStorage();

    window.addEventListener('storage', lerContadorLocalStorage);

    const interval = setInterval(lerContadorLocalStorage, 1000);

    return () => {
      window.removeEventListener('storage', lerContadorLocalStorage);
      clearInterval(interval);
    };
  }, [lojistaId]);

  // Validação reativa e blindada do PDV utilizando useMemo para refletir alterações instantaneamente
  const pdvLiberado = useMemo(() => {
    if (typeof masterLiberou === "function") {
      return masterLiberou("temPdv");
    }
    return Boolean(
      planoEfetivo?.temPdv ??
      planoEfetivo?.configs?.temPdv ??
      planoEfetivo?.dadosPlano?.temPdv ??
      false
    );
  }, [planoEfetivo, masterLiberou]);

  const menuItens = [
    { id: 'dash', label: 'Dashboard', icon: <FiPieChart /> },
    { id: 'produtos', label: 'Produtos', icon: <FiPackage /> },
    { id: 'pedidos', label: 'Pedidos', icon: <FiShoppingCart />, badge: novosPedidosCount },
    // O PDV só aparece no menu se a verificação reativa retornar true
    ...(pdvLiberado ? [{ id: 'pdv', label: 'PDV (Caixa)', icon: <FiDollarSign /> }] : []),
    { id: 'estoque', label: 'Estoque', icon: <FiArchive /> },
    { id: 'config', label: 'Configurações', icon: <FiSettings /> },
  ];

  const handleMudarTela = (id: string) => {
    if (typeof setTelaAtiva === 'function') {
      setTelaAtiva(id);
    } else {
      console.warn("Aviso: setTelaAtiva não foi passado corretamente para a Sidebar.");
    }
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Overlay Escuro no fundo quando o menu estiver aberto no mobile */}
      {isOpenMobile && (
        <div style={styles.overlay} onClick={onCloseMobile} />
      )}

      <aside style={{
        ...styles.sidebar,
        transform: isOpenMobile ? 'translateX(0)' : undefined,
      }} className="sidebar-container">

        {/* Botão de Fechar no Mobile */}
        {onCloseMobile && (
          <button onClick={onCloseMobile} style={styles.closeBtnMobile} aria-label="Fechar menu">
            <FiX size={24} color="#fff" />
          </button>
        )}

        <div style={styles.brandArea}>
          <div style={styles.logoContainer}>
            {dadosLoja.logoUrl ? <img src={dadosLoja.logoUrl} alt="Logo" style={styles.logoImg} /> : <div style={styles.logoPlaceholder}>{dadosLoja.nomeLoja.charAt(0).toUpperCase()}</div>}
          </div>
          <h2 style={styles.storeName}>{dadosLoja.nomeLoja}</h2>
        </div>

        <nav style={styles.nav}>
          {menuItens.map((item) => (
            <button key={item.id} onClick={() => handleMudarTela(item.id)} style={{
              ...styles.navBtn,
              background: telaAtiva === item.id ? '#334155' : 'transparent',
              color: telaAtiva === item.id ? '#fdb813' : '#94a3b8'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {item.icon}
                <span>{item.label}</span>
              </span>

              {/* Exibe o badge vermelho se houver pedidos novos */}
              {item.id === 'pedidos' && (item.badge ?? 0) > 0 && (
                <span style={styles.badgeNovo}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          {role === 'master' && (
            <button onClick={() => handleMudarTela('gestao-geral')} style={{
              ...styles.navBtn,
              marginTop: '10px',
              border: '1px solid #fdb813',
              background: telaAtiva === 'gestao-geral' ? '#455533' : 'transparent',
              color: '#fdb813'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FiShield />
                <span>Gestão Geral</span>
              </span>
            </button>
          )}
        </nav>

        <button onClick={onLogout} style={styles.logoutBtn}>
          <FiLogOut />
          <span style={{ marginLeft: '12px' }}>Sair do Sistema</span>
        </button>
      </aside>

      <style jsx>{`
        @media (max-width: 768px) {
          .sidebar-container {
            transform: ${isOpenMobile ? 'translateX(0)' : 'translateX(-100%)'} !important;
          }
        }
        @media (min-width: 769px) {
          .sidebar-container {
            transform: translateX(0) !important;
          }
        }
      `}</style>
    </>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  sidebar: {
    width: '260px',
    background: '#1e293b',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 1000,
    transition: 'transform 0.3s ease-in-out',
    boxShadow: '4px 0 15px rgba(0,0,0,0.1)',
    margin: 0,
    padding: 0
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  },
  closeBtnMobile: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'none',
  },
  brandArea: { padding: '20px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid #334155', marginBottom: '10px', position: 'relative' },
  logoContainer: { width: '85px', height: '85px', borderRadius: '12px', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '3px solid #fdb813', marginBottom: '10px' },
  logoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  logoPlaceholder: { fontSize: '36px', fontWeight: 'bold', color: '#fdb813' },
  storeName: { fontSize: '18px', color: '#fff', textAlign: 'center', fontWeight: '600' },
  nav: { flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px', overflow: 'hidden' }, // <--- Alterado de 'overflowY: auto' para 'overflow: 'hidden''
  navBtn: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '15px', width: '100%', transition: 'all 0.2s', textAlign: 'left' },
  badgeNovo: {
    backgroundColor: '#ef4444',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 'bold',
    padding: '2px 7px',
    borderRadius: '10px',
    marginLeft: '8px'
  },
  logoutBtn: { padding: '20px', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid #334155', width: '100%', fontWeight: 'bold', fontSize: '15px' }
};