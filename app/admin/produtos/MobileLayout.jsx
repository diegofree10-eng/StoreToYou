"use client";
import React from "react";
import { FiBarChart2, FiBox, FiHome, FiShoppingBag } from "react-icons/fi";
import DashboardGestao from "../DashboardGestao";

export default function MobileLayout({ telaAtiva, setTelaAtiva }) {
  return (
    <div style={{ background: "#fdb813", minHeight: "100vh", display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '30px 20px', textAlign: 'center', color: '#1e293b' }}>
        <strong style={{ fontSize: '18px' }}>Festa em Topo ▾</strong>
        <p style={{ fontSize: '12px', margin: 0, opacity: 0.8 }}>Painel Administrativo</p>
      </header>

      <main style={{ flex: 1, background: "#f8fafc", borderTopLeftRadius: "30px", borderTopRightRadius: "30px", padding: '10px', boxShadow: '0 -5px 15px rgba(0,0,0,0.05)' }}>
        
        <div style={tabContainerStyle}>
          {['Diário', 'Semanal', 'Mensal', 'Anual'].map(t => (
            <button key={t} style={t === 'Mensal' ? activeTabStyle : tabStyle}>{t}</button>
          ))}
        </div>

        {telaAtiva === 'dash' && <DashboardGestao />}
        
        {telaAtiva === 'produtos' && (
          <div style={{ padding: '20px' }}>
             <h4>Categorias & Produtos</h4>
             {/* CORREÇÃO AQUI: Usei barras para evitar o erro de caractere do React */}
             <p style={{ fontSize: '13px', color: '#666' }}>
               Hierarquia: Lojista / UID / Categorias
             </p>
          </div>
        )}
      </main>

      <nav style={navStyle}>
        <div style={navItem(telaAtiva === 'dash')} onClick={() => setTelaAtiva('dash')}>
          <FiBarChart2 size={22} /> <span>Balanço</span>
        </div>
        <div style={navItem(telaAtiva === 'produtos')} onClick={() => setTelaAtiva('produtos')}>
          <FiBox size={22} /> <span>Estoque</span>
        </div>
        <div style={navItem(false)}><FiHome size={22} /> <span>Início</span></div>
        <div style={navItem(false)}><FiShoppingBag size={22} /> <span>Vendas</span></div>
      </nav>
    </div>
  );
}

const tabContainerStyle = { display: 'flex', background: '#fff', margin: '15px', borderRadius: '12px', padding: '5px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
const tabStyle = { flex: 1, padding: '10px', border: 'none', background: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer' };
const activeTabStyle = { ...tabStyle, background: '#1e293b', color: '#fff', borderRadius: '8px' };
const navStyle = { position: 'fixed', bottom: 0, width: '100%', background: '#fff', display: 'flex', justifyContent: 'space-around', padding: '15px 0 25px', borderTop: '1px solid #e2e8f0' };
const navItem = (active) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', color: active ? '#fdb813' : '#94a3b8', fontSize: '11px', gap: '4px', cursor: 'pointer' });