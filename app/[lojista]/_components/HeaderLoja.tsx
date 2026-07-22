"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from "next/navigation";
import { FiMenu, FiSearch, FiInstagram, FiShoppingCart, FiX } from "react-icons/fi";
import { useCart } from "@/context/CartContext";
import { useLoja } from "./LojaContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, limit } from "firebase/firestore";

export default function HeaderLoja() {
  const router = useRouter();
  const params = useParams();
  const slug = params.lojista as string;
  const { cart } = useCart();
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [categoriasState, setCategoriasState] = useState<any[]>([]);

  const { dadosLoja, isLojaAberta } = useLoja();

  const lojaObj = dadosLoja?.dadosLoja || dadosLoja || {};
  const ap = dadosLoja?.aparencia || {};
  
  const nomeLoja = lojaObj?.dsNomeLoja || lojaObj?.nomeLoja || slug || "Loja";
  const logoUrl = lojaObj?.dsLogoLoja || lojaObj?.logoUrl || "";

  const config = {
    nomeLoja: nomeLoja,
    logo: logoUrl,
    corDestaque: ap?.dscorPrincipal || "#FFCC80",
    corSecundaria: ap?.dscorSecundaria || "#fdf5eb",
    corTexto: ap?.dscorTextoCard || "#8B5E3C",
  };

  useEffect(() => {
    async function carregarCategoriasHeader() {
      if (dadosLoja?.categorias && dadosLoja.categorias.length > 0) {
        setCategoriasState(dadosLoja.categorias);
        return;
      }
      if (!slug) return;
      try {
        const q = query(collection(db, "lojistas"), where("dadosLoja.dsSlug", "==", slug), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docId = snap.docs[0].id;
          const catsSnap = await getDocs(collection(db, "lojistas", docId, "categorias"));
          setCategoriasState(catsSnap.docs.map(c => ({ id: c.id, ...c.data() })));
        }
      } catch (e) {
        console.error("Erro ao buscar categorias no header:", e);
      }
    }
    carregarCategoriasHeader();
  }, [slug, dadosLoja]);

  const totalCarrinho = Array.isArray(cart) ? cart.reduce((a, b) => a + (b.qty || b.quantidade || 1), 0) : 0;

  const handleCarrinhoClick = () => {
    if (!isLojaAberta) {
      alert("A loja está em modo férias. Pedidos desativados.");
      return;
    }
    router.push(`/${slug}/carrinho`);
  };

  const irParaCategoria = (nomeCategoria: string) => {
    setMenuMobileAberto(false);
    router.push(`/${slug}/PagCategoria?cat=${encodeURIComponent(nomeCategoria)}`);
  };

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
      
      {/* 1. BARRA SUPERIOR PRINCIPAL (Altura unificada e espaçamento igual) */}
      <div style={{ backgroundColor: config.corDestaque, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 30px', minHeight: '75px', boxSizing: 'border-box' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Menu Hambúrguer (Mobile) */}
          <button className="mobile-menu-btn" onClick={() => setMenuMobileAberto(!menuMobileAberto)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'none', alignItems: 'center' }}>
            <FiMenu size={26} />
          </button>

          {/* Logo / Nome da Loja Padronizado */}
          <div onClick={() => router.push(`/${slug}`)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '55px', height: '55px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '12px', backgroundColor: 'transparent', flexShrink: 0 }}>
              {config.logo ? (
                <img src={config.logo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt={config.nomeLoja} />
              ) : (
                <span style={{ fontSize: '10px', color: '#fff' }}>Logo</span>
              )}
            </div>
            <span className="nome-loja-header" style={{ color: 'white', fontWeight: '900', fontSize: '15px', whiteSpace: 'nowrap', textShadow: '1px 1px 3px rgba(0,0,0,0.2)', letterSpacing: '0.5px' }}>
              {config.nomeLoja.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Pesquisa Desktop */}
        <div className="search-box-desktop" style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '20px', padding: '8px 18px', width: '350px', boxSizing: 'border-box' }}>
          <input type="text" placeholder="Pesquisar produtos ativos..." style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', background: 'transparent' }} />
          <FiSearch size={18} color="#888" />
        </div>

        {/* Ícones Direita */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <FiInstagram size={22} color="#fff" style={{ cursor: 'pointer' }} />
          <div onClick={handleCarrinhoClick} style={{ cursor: isLojaAberta ? 'pointer' : 'not-allowed', position: 'relative', color: '#fff', display: 'flex', alignItems: 'center', opacity: isLojaAberta ? 1 : 0.6 }}>
            <FiShoppingCart size={26} />
            {isLojaAberta && totalCarrinho > 0 && (
              <span style={{ position: 'absolute', top: '-6px', right: '-8px', background: '#ff4d4d', color: 'white', borderRadius: '50%', padding: '1px 6px', fontSize: '11px', fontWeight: 'bold' }}>
                {totalCarrinho}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. FAIXA INFERIOR DE CATEGORIAS */}
      <div style={{ backgroundColor: config.corSecundaria, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '30px', padding: '12px 15px', color: config.corTexto, fontWeight: 'bold', fontSize: '13px', overflowX: 'auto', whiteSpace: 'nowrap', borderTop: '1px solid rgba(0,0,0,0.04)', boxSizing: 'border-box' }}>
        {categoriasState?.map((cat: any) => (
          <span 
            key={cat.id} 
            onClick={() => irParaCategoria(cat.nome)} 
            style={{ cursor: 'pointer', textTransform: 'uppercase' }}
          >
            {cat.nome}
          </span>
        ))}
      </div>

      {/* 3. MENU LATERAL MOBILE */}
      {menuMobileAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex' }}>
          <div style={{ width: '280px', backgroundColor: '#fff', height: '100%', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>Menu</span>
              <button onClick={() => setMenuMobileAberto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><FiX size={24} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <span onClick={() => { router.push(`/${slug}`); setMenuMobileAberto(false); }} style={{ cursor: 'pointer', fontWeight: 'bold' }}>Início</span>
              {categoriasState?.map((cat: any) => (
                <span 
                  key={cat.id} 
                  onClick={() => irParaCategoria(cat.nome)} 
                  style={{ cursor: 'pointer', textTransform: 'uppercase', fontSize: '14px' }}
                >
                  {cat.nome}
                </span>
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }} onClick={() => setMenuMobileAberto(false)} />
        </div>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .search-box-desktop { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .nome-loja-header { font-size: 16px !important; }
        }
      `}</style>
    </header>
  );
}