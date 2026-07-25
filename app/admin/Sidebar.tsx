"use client";
import React, { useEffect, useState } from "react";
import { FiPieChart, FiPackage, FiShoppingCart, FiSettings, FiLogOut, FiShield, FiX } from "react-icons/fi";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, getDoc, updateDoc } from "firebase/firestore";

interface SidebarProps {
  telaAtiva: string;
  setTelaAtiva: (tela: string) => void;
  onLogout: () => void;
  isOpenMobile?: boolean;           // 👈 Controle de abertura no mobile
  onCloseMobile?: () => void;       // 👈 Função para fechar o menu mobile
}

export default function Sidebar({ telaAtiva, setTelaAtiva, onLogout, isOpenMobile, onCloseMobile }: SidebarProps) {
  const [role, setRole] = useState<string | null>(null);
  const [dadosLoja, setDadosLoja] = useState({
    nomeLoja: "Carregando...",
    logoUrl: null
  });

  const unsubRef = React.useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "usuarios", user.uid));
          let docRef;

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setRole(userData.role);
            docRef = doc(db, "lojistas", userData.lojaId);
          } else {
            docRef = doc(db, "lojistas", user.uid);
          }

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
          });
        } catch (error) {
          console.error("Erro na sidebar:", error);
        }
      }
    });

    return () => {
      unsubAuth();
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  const menuItens = [
    { id: 'dash', label: 'Dashboard', icon: <FiPieChart /> },
    { id: 'produtos', label: 'Produtos', icon: <FiPackage /> },
    { id: 'pedidos', label: 'Pedidos', icon: <FiShoppingCart /> },
    { id: 'config', label: 'Configurações', icon: <FiSettings /> },
  ];

  const handleMudarTela = (id: string) => {
    setTelaAtiva(id);
    if (onCloseMobile) onCloseMobile(); // Fecha o menu no mobile ao clicar em um item
  };

  return (
    <>
      {/* Overlay Escuro no fundo quando o menu estiver aberto no mobile */}
      {isOpenMobile && (
        <div style={styles.overlay} onClick={onCloseMobile} />
      )}

      <aside style={{
        ...styles.sidebar,
        transform: isOpenMobile ? 'translateX(0)' : 'translateX(-100%)', // 👈 Lógica de deslizar no mobile
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
              {item.icon}
              <span style={{ marginLeft: '12px' }}>{item.label}</span>
            </button>
          ))}

          {role === 'master' && (
            <button onClick={() => handleMudarTela('gestao-geral')} style={{
              ...styles.navBtn,
              marginTop: '10px',
              border: '1px solid #fdb813',
              background: telaAtiva === 'gestao-geral' ? '#334155' : 'transparent',
              color: '#fdb813'
            }}>
              <FiShield />
              <span style={{ marginLeft: '12px' }}>Gestão Geral</span>
            </button>
          )}
        </nav>

        <button onClick={onLogout} style={styles.logoutBtn}>
          <FiLogOut />
          <span style={{ marginLeft: '12px' }}>Sair do Sistema</span>
        </button>
      </aside>

      <style jsx>{`
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
  // 👇 Reduzimos o padding superior de 40px para 20px para colar no topo
  brandArea: { padding: '20px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid #334155', marginBottom: '10px', position: 'relative' },
  logoContainer: { width: '85px', height: '85px', borderRadius: '12px', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '3px solid #fdb813', marginBottom: '10px' },
  logoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  logoPlaceholder: { fontSize: '36px', fontWeight: 'bold', color: '#fdb813' },
  storeName: { fontSize: '18px', color: '#fff', textAlign: 'center', fontWeight: '600' },
  nav: { flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px', overflowY: 'auto' },
  navBtn: { display: 'flex', alignItems: 'center', padding: '12px 15px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '15px', width: '100%', transition: 'all 0.2s', textAlign: 'left' },
  logoutBtn: { padding: '20px', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid #334155', width: '100%', fontWeight: 'bold', fontSize: '15px' }
};