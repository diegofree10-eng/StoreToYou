"use client";

import React, { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, getDocs, limit } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { FiSearch, FiUser, FiHeart, FiShoppingCart, FiTruck, FiShield, FiSmile, FiGrid, FiArrowRight, FiMenu, FiX } from "react-icons/fi";
import { useCart } from "@/context/CartContext";
import { useLoja } from "@/app/[lojista]/_components/LojaContext";

export default function HomeLayoutEcommerce() {
  const params = useParams();
  const router = useRouter();
  const { cart } = useCart();
  const { dadosLoja, isLojaAberta } = useLoja();

  const slug = params.lojista as string;
  const [produtosDestaque, setProdutosDestaque] = useState<any[]>([]);
  const [categoriasState, setCategoriasState] = useState<any[]>([]);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  const lojaObj = dadosLoja?.dadosLoja || dadosLoja || {};
  const ap = dadosLoja?.aparencia || {};

  const nomeLoja = lojaObj?.dsNomeLoja || lojaObj?.nomeLoja || slug || "Loja";
  const logoUrl = lojaObj?.dsLogoLoja || lojaObj?.logoUrl || "";

  const config = {
    corPrimaria: ap?.dscorPrincipal || "#6366f1",
    corSecundaria: ap?.dscorSecundaria || "#fdf5eb",
    corFundoSite: ap?.dscorFundo || "#f8fafc",
    corTextoCard: ap?.dscorTextoCard || "#1e293b",
    corDestaque: ap?.dscorSecundaria || "#f43f5e",
  };

  useEffect(() => {
    async function carregarDadosLoja() {
      if (!slug) return;
      try {
        const q = query(collection(db, "lojistas"), where("dadosLoja.dsSlug", "==", slug), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docLoja = snap.docs[0];

          const catsSnap = await getDocs(collection(db, "lojistas", docLoja.id, "categorias"));
          setCategoriasState(catsSnap.docs.map(c => ({ id: c.id, ...c.data() })));

          const prodRef = collection(db, "lojistas", docLoja.id, "produtos");
          const unsubProd = onSnapshot(prodRef, (pSnap) => {
            const lista = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setProdutosDestaque(lista);
          });
          return () => unsubProd();
        }
      } catch (e) {
        console.error(e);
      }
    }
    carregarDadosLoja();
  }, [slug]);

  const totalCarrinho = Array.isArray(cart) ? cart.reduce((a, b) => a + (b.qty || b.quantidade || 1), 0) : 0;

  const irParaCategoria = (nomeCat: string) => {
    setMenuMobileAberto(false);
    router.push(`/${slug}/PagCategoria?cat=${encodeURIComponent(nomeCat)}`);
  };

  return (
    <div style={{ backgroundColor: config.corFundoSite, color: config.corTextoCard, minHeight: '100vh', fontFamily: 'sans-serif', boxSizing: 'border-box', paddingBottom: '60px', overflowX: 'hidden' }}>
      
      {/* 1. TOPO DE AVISOS */}
      <div className="top-avisos" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', padding: '8px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff', textAlign: 'center' }}>
        <span>🚚 Frete para todo o Brasil</span>
        <span className="hide-mobile">💳 Parcele em até 12x sem juros</span>
        <span>📞 Atendimento</span>
      </div>

      {/* 2. HEADER DA LOJA */}
      <div className="header-loja" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: '15px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', gap: '15px', flexWrap: 'wrap', boxSizing: 'border-box' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Botão Sanduíche visível apenas em telas menores */}
          <button className="menu-sanduiche-btn" onClick={() => setMenuMobileAberto(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: config.corTextoCard, display: 'none', alignItems: 'center', padding: 0 }}>
            <FiMenu size={24} />
          </button>

          <div onClick={() => router.push(`/${slug}`)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '12px', backgroundColor: 'transparent', flexShrink: 0 }}>
              {logoUrl ? (
                <img src={logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt={nomeLoja} />
              ) : (
                <div style={{ backgroundColor: config.corPrimaria, color: '#fff', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>🛍️</div>
              )}
            </div>
            <div>
              <h1 className="nome-loja-text" style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: config.corTextoCard }}>{nomeLoja.toUpperCase()}</h1>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>Sua loja, do seu jeito</span>
            </div>
          </div>
        </div>

        {/* Caixa de Pesquisa */}
        <div className="search-box" style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: '25px', padding: '8px 15px', flex: 1, minWidth: '220px', boxSizing: 'border-box' }}>
          <input type="text" placeholder="Buscar produtos..." style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px' }} />
          <FiSearch color="#64748b" size={18} />
        </div>

        {/* Ícones */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#64748b' }}>
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', cursor: 'pointer' }}>
            <FiUser size={18} /> Entrar
          </div>
          <FiHeart size={20} style={{ cursor: 'pointer' }} />
          <div onClick={() => router.push(`/${slug}/carrinho`)} style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <FiShoppingCart size={24} color="#64748b" />
            {totalCarrinho > 0 && (
              <span style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: config.corPrimaria, color: '#fff', fontSize: '10px', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {totalCarrinho}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. CONTEÚDO PRINCIPAL (Grid com Sidebar lateral em Desktop) */}
      <div className="main-container" style={{ maxWidth: '1300px', margin: '20px auto 0', padding: '0 15px', display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', boxSizing: 'border-box' }}>
        
        {/* Sidebar de Categorias (Desktop) */}
        <div className="sidebar-categorias" style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', height: 'fit-content' }}>
          <div style={{ backgroundColor: config.corPrimaria, color: '#fff', padding: '12px 15px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <FiGrid /> Categorias ({categoriasState.length})
          </div>
          
          <div className="lista-categorias-scroll" style={{ maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
            {categoriasState.length > 0 ? (
              categoriasState.map((cat: any) => (
                <div 
                  key={cat.id} 
                  onClick={() => irParaCategoria(cat.nome)} 
                  style={{ padding: '9px 12px', fontSize: '13px', color: config.corTextoCard, borderRadius: '6px', cursor: 'pointer', textTransform: 'uppercase', transition: '0.2s', borderBottom: '1px solid #f8fafc' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = config.corSecundaria}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {cat.nome}
                </div>
              ))
            ) : (
              <div style={{ padding: '10px', fontSize: '12px', color: '#999' }}>Carregando...</div>
            )}
          </div>
        </div>

        {/* Banner Hero Compacto */}
        <div className="banner-hero" style={{ backgroundColor: config.corSecundaria, borderRadius: '16px', padding: '28px 35px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden', boxSizing: 'border-box', minHeight: '220px' }}>
          <div style={{ maxWidth: '420px', zIndex: 2 }}>
            <span style={{ backgroundColor: config.corPrimaria, color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>Destaque da Loja</span>
            <h2 className="banner-title" style={{ fontSize: '26px', fontWeight: '900', color: config.corTextoCard, margin: '10px 0', lineHeight: '1.2' }}>Tudo o que você precisa em um só lugar!</h2>
            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '18px' }}>Os melhores produtos com segurança e praticidade para você.</p>
            <button style={{ backgroundColor: config.corPrimaria, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              Ver ofertas <FiArrowRight />
            </button>
          </div>
          <div className="banner-emoji" style={{ width: '150px', height: '150px', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '45px', zIndex: 1, flexShrink: 0 }}>
            🎁
          </div>
        </div>
      </div>

      {/* 4. BLOCOS DE BENEFÍCIOS */}
      <div className="beneficios-grid" style={{ maxWidth: '1300px', margin: '20px auto 0', padding: '0 15px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', boxSizing: 'border-box' }}>
        {[
          { icon: <FiTruck size={20} color={config.corPrimaria} />, title: "Frete para todo o Brasil", desc: "Entrega garantida" },
          { icon: <FiShield size={20} color={config.corPrimaria} />, title: "Compra 100% segura", desc: "Ambiente protegido" },
          { icon: <FiSmile size={20} color={config.corPrimaria} />, title: "Satisfação garantida", desc: "Qualidade comprovada" },
          { icon: <FiGrid size={20} color={config.corPrimaria} />, title: "Parcele em até 12x", desc: "No cartão de crédito" }
        ].map((b, i) => (
          <div key={i} style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div>{b.icon}</div>
            <div>
              <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: config.corTextoCard }}>{b.title}</h4>
              <span style={{ fontSize: '10px', color: '#64748b' }}>{b.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 5. VITRINE DE PRODUTOS */}
      <div style={{ maxWidth: '1300px', margin: '30px auto 0', padding: '0 15px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: config.corTextoCard }}>Produtos em Destaque</h3>
          <span style={{ fontSize: '12px', color: config.corPrimaria, fontWeight: 'bold', cursor: 'pointer' }}>Ver todos &gt;</span>
        </div>

        <div className="grid-produtos">
          {produtosDestaque.length > 0 ? (
            produtosDestaque.map((prod: any) => (
              <div 
                key={prod.id} 
                onClick={() => router.push(`/${slug}/produto/${prod.id}`)}
                style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', cursor: 'pointer', position: 'relative', boxSizing: 'border-box' }}
              >
                <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px' }}>
                  <img src={prod.capa || "https://via.placeholder.com/400"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={prod.nome} />
                </div>
                <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: config.corTextoCard, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.nome}</h4>
                <p style={{ fontSize: '15px', fontWeight: '900', color: config.corPrimaria, margin: '0 0 10px' }}>R$ {prod.precoBasico || "0,00"}</p>
                <button style={{ width: '100%', backgroundColor: isLojaAberta ? config.corPrimaria : '#94a3b8', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', marginTop: 'auto' }}>
                  {isLojaAberta ? "Ver Detalhes" : "Apenas Vitrine"}
                </button>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#888' }}>Nenhum produto cadastrado no momento.</div>
          )}
        </div>
      </div>

      {/* 6. MODAL DO MENU SANDUÍCHE (Mobile) */}
      {menuMobileAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex' }}>
          <div style={{ width: '280px', backgroundColor: '#fff', height: '100%', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box', boxShadow: '4px 0 15px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '16px', color: config.corTextoCard }}>
                <FiGrid color={config.corPrimaria} /> Categorias
              </div>
              <button onClick={() => setMenuMobileAberto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <FiX size={24} />
              </button>
            </div>
            
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              {categoriasState.length > 0 ? (
                categoriasState.map((cat: any) => (
                  <div 
                    key={cat.id} 
                    onClick={() => irParaCategoria(cat.nome)} 
                    style={{ padding: '12px', fontSize: '13px', fontWeight: 'bold', color: config.corTextoCard, borderRadius: '8px', cursor: 'pointer', textTransform: 'uppercase', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}
                  >
                    {cat.nome}
                  </div>
                ))
              ) : (
                <div style={{ padding: '15px', fontSize: '13px', color: '#999', textAlign: 'center' }}>Nenhuma categoria encontrada.</div>
              )}
            </div>
          </div>
          <div style={{ flex: 1 }} onClick={() => setMenuMobileAberto(false)} />
        </div>
      )}

      <style jsx>{`
        .lista-categorias-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .lista-categorias-scroll::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .lista-categorias-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .grid-produtos {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
        }
        .beneficios-grid {
          grid-template-columns: repeat(4, 1fr);
        }
        @media (max-width: 1024px) {
          .main-container {
            grid-template-columns: 1fr !important;
          }
          .sidebar-categorias {
            display: none !important; 
          }
          .menu-sanduiche-btn {
            display: flex !important;
          }
          .beneficios-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .grid-produtos {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (max-width: 768px) {
          .hide-mobile {
            display: none !important;
          }
          .header-loja {
            padding: 10px 15px !important;
          }
          .search-box {
            order: 3;
            width: 100% !important;
            margin-top: 5px;
          }
          .banner-hero {
            padding: 20px !important;
            flex-direction: column-reverse;
            text-align: center;
            min-height: auto !important;
          }
          .banner-hero div {
            max-width: 100% !important;
          }
          .banner-emoji {
            width: 100px !important;
            height: 100px !important;
            font-size: 32px !important;
            margin-bottom: 10px;
          }
          .banner-title {
            font-size: 20px !important;
          }
          .beneficios-grid {
            grid-template-columns: 1fr !important;
          }
          .grid-produtos {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}