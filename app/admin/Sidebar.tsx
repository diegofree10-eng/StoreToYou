"use client";
import React, { useEffect, useState } from "react";
import { FiPieChart, FiPackage, FiShoppingCart, FiSettings, FiLogOut, FiShield } from "react-icons/fi";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, getDoc, updateDoc } from "firebase/firestore";

// Adicionamos 'onLogout' na interface
interface SidebarProps {
  telaAtiva: string;
  setTelaAtiva: (tela: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ telaAtiva, setTelaAtiva, onLogout }: SidebarProps) {
  const [role, setRole] = useState<string | null>(null);
  const [dadosLoja, setDadosLoja] = useState({
    nomeLoja: "Carregando...",
    logoUrl: null
  });

  const unsubRef = React.useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("Usuário autenticado:", user.uid);
        try {
          const userDoc = await getDoc(doc(db, "usuarios", user.uid));
          let docRef;

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setRole(userData.role);
            docRef = doc(db, "lojistas", userData.lojaId);
            console.log("Monitorando loja via ID:", userData.lojaId);
          } else {
            docRef = doc(db, "lojistas", user.uid);
            console.log("Monitorando loja via UID:", user.uid);
          }

          if (unsubRef.current) unsubRef.current();

          // Substitua o onSnapshot atual na Sidebar.tsx por este:
          unsubRef.current = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();

              // Tenta ler do objeto dadosLoja primeiro, se falhar, lê da raiz
              const dados = data.dadosLoja || data;

              const statusAtual = dados.dsStatusLoja || 'ativo';
              const nomeLoja = dados.dsNomeLoja || "Minha Loja";
              const logoUrl = dados.dsLogoLoja || null;
              const tsVencimento = dados.tsVencimentoLoja?.toDate();
              const now = new Date();

              // Lógica de bloqueio
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

  return (
    <aside style={styles.sidebar}>
      {/* ... (Seu código de marca permanece igual) */}
      <div style={styles.brandArea}>
        <div style={styles.logoContainer}>
          {dadosLoja.logoUrl ? <img src={dadosLoja.logoUrl} alt="Logo" style={styles.logoImg} /> : <div style={styles.logoPlaceholder}>{dadosLoja.nomeLoja.charAt(0).toUpperCase()}</div>}
        </div>
        <h2 style={styles.storeName}>{dadosLoja.nomeLoja}</h2>
      </div>

      <nav style={styles.nav}>
        {menuItens.map((item) => (
          <button key={item.id} onClick={() => setTelaAtiva(item.id)} style={{
            ...styles.navBtn,
            background: telaAtiva === item.id ? '#334155' : 'transparent',
            color: telaAtiva === item.id ? '#fdb813' : '#94a3b8'
          }}>
            {item.icon}
            <span style={{ marginLeft: '12px' }}>{item.label}</span>
          </button>
        ))}

        {role === 'master' && (
          <button onClick={() => setTelaAtiva('gestao-geral')} style={{
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

      {/* Botão de Logout usando a função passada por props */}
      <button onClick={onLogout} style={styles.logoutBtn}>
        <FiLogOut />
        <span style={{ marginLeft: '12px' }}>Sair do Sistema</span>
      </button>
    </aside>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  // ... (Mantenha seus estilos originais)
  sidebar: { width: '260px', background: '#1e293b', color: '#fff', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 },
  brandArea: { padding: '40px 20px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid #334155', marginBottom: '10px' },
  logoContainer: { width: '105px', height: '105px', borderRadius: '12px', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '3px solid #fdb813', marginBottom: '15px' },
  logoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  logoPlaceholder: { fontSize: '36px', fontWeight: 'bold', color: '#fdb813' },
  storeName: { fontSize: '18px', color: '#fff', textAlign: 'center', fontWeight: '600' },
  nav: { flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px' },
  navBtn: { display: 'flex', alignItems: 'center', padding: '12px 15px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '15px', width: '100%', transition: 'all 0.2s', textAlign: 'left' },
  logoutBtn: { padding: '20px', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid #334155', width: '100%', fontWeight: 'bold', fontSize: '15px' }
};