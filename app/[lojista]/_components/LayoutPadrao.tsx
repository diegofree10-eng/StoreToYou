"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from "next/navigation";
import { FiSearch, FiShoppingCart, FiMenu, FiX, FiGrid } from "react-icons/fi";
import { FaInstagram, FaFacebook, FaWhatsapp, FaTiktok, FaYoutube, FaTwitter } from "react-icons/fa";
import { useCart } from "@/context/CartContext";
import { useLoja } from "./LojaContext";

interface LayoutSitePadraoProps {
    children?: React.ReactNode;
    bannerTopo?: React.ReactNode;
    categorias?: any[];
}

export default function LayoutPadrao({ children, bannerTopo, categorias = [] }: LayoutSitePadraoProps) {
    const params = useParams();
    const router = useRouter();
    const { cart } = useCart();
    const { dadosLoja } = useLoja();

    const slug = params.lojista as string;
    const [menuMobileAberto, setMenuMobileAberto] = useState(false);

    const lojaObj = dadosLoja?.dadosLoja || dadosLoja || {};
    const ap = dadosLoja?.aparencia || {};

    const nomeLoja = lojaObj?.dsNomeLoja || lojaObj?.nomeLoja || slug || "Loja";
    const logoUrl = lojaObj?.dsLogoLoja || lojaObj?.logoUrl || "";

    const numeroWhatsappRaw = lojaObj?.nrWhatssapLoja || "";
    const numeroWhatsappLimpo = numeroWhatsappRaw.replace(/\D/g, '');
    const linkWhatsappFlutuante = numeroWhatsappLimpo ? `https://wa.me/55${numeroWhatsappLimpo}` : '';

    const redesArray = Array.isArray(lojaObj?.redesSociais) ? lojaObj.redesSociais : [];

    const listaRedes = redesArray.map((item: any) => {
        const plat = (item.plataforma || "").toLowerCase();
        let icone = null;
        let urlFinal = item.url || "";

        if (plat.includes('insta')) {
            icone = <FaInstagram size={18} />;
            if (!urlFinal.startsWith('http')) {
                const userClean = urlFinal.replace('@', '');
                urlFinal = `https://instagram.com/${userClean}`;
            }
        } else if (plat.includes('tiktok')) {
            icone = <FaTiktok size={18} />;
            if (!urlFinal.startsWith('http')) {
                const userClean = urlFinal.replace('@', '');
                urlFinal = `https://tiktok.com/@${userClean}`;
            }
        } else if (plat.includes('face')) {
            icone = <FaFacebook size={18} />;
        } else if (plat.includes('youtube')) {
            icone = <FaYoutube size={18} />;
        } else if (plat.includes('twitter') || plat.includes('x')) {
            icone = <FaTwitter size={18} />;
        }

        return { key: plat, url: urlFinal, icon: icone };
    }).filter((r: any) => Boolean(r.icon) && Boolean(r.url));

    const config = {
        corPrimaria: ap?.dscorPrincipal || "#6366f1",
        corSecundaria: ap?.dscorSecundaria || "#fdf5eb",
        corFundoSite: ap?.dscorFundo || "#f8fafc",
        corTextoCard: ap?.dscorTextoCard || "#1e293b",
    };

    const totalCarrinho = Array.isArray(cart) ? cart.reduce((a, b) => a + (b.qty || b.quantidade || 1), 0) : 0;

    const irParaCategoria = (nomeCat: string) => {
        setMenuMobileAberto(false);
        router.push(`/${slug}/PagCategoria?cat=${encodeURIComponent(nomeCat)}`);
    };

    return (
        <div style={{ backgroundColor: config.corFundoSite, color: config.corTextoCard, minHeight: '100vh', fontFamily: 'sans-serif', boxSizing: 'border-box', paddingBottom: '60px', overflowX: 'hidden', position: 'relative' }}>

            {/* TOPO DE AVISOS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', padding: '8px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff', textAlign: 'center' }}>
                <span>🚚 Frete para todo o Brasil</span>
                <span className="hide-mobile">💳 Parcele em até 12x sem juros</span>
                <span>📞 Atendimento</span>
            </div>

            {/* HEADER DA LOJA */}
            <header className="header-loja" style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
                alignItems: 'center',
                backgroundColor: config.corSecundaria,
                padding: '0 25px',
                height: '80px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                boxSizing: 'border-box'
            }}>
                {/* Bloco Esquerdo (Logo + Nome) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '100%' }}>
                    <div onClick={() => router.push(`/${slug}`)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', height: '100%' }}>
                        <div className="logo-wrapper-header" style={{ width: '50px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', flexShrink: 0 }}>
                            {logoUrl ? <img src={logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt={nomeLoja} /> : <div>🛍️</div>}
                        </div>
                        <div className="nome-loja-header" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <span style={{ fontSize: '15px', fontWeight: '900', color: config.corTextoCard, whiteSpace: 'nowrap' }}>{nomeLoja.toUpperCase()}</span>
                        </div>
                    </div>
                </div>

                {/* Barra de Pesquisa Central */}
                <div className="search-box" style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: '25px', padding: '8px 18px', width: '340px', boxSizing: 'border-box', justifySelf: 'center', border: '1px solid rgba(0,0,0,0.08)' }}>
                    <input
                        type="text"
                        placeholder="Buscar produtos..."
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: config.corTextoCard }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const inputVal = (e.target as HTMLInputElement).value;
                                if (inputVal.trim()) {
                                    router.push(`/${slug}/PagBusca?q=${encodeURIComponent(inputVal)}`);
                                }
                            }
                        }}
                    />
                    <FiSearch color="#64748b" size={18} />
                </div>

                {/* Bloco Direito (Redes + Carrinho) */}
                <div className="header-actions-right" style={{ display: 'flex', alignItems: 'center', gap: '18px', justifySelf: 'end' }}>
                    <div className="hide-mobile redes-sociais-desktop" style={{ display: 'flex', gap: '12px', color: '#64748b' }}>
                        {listaRedes.map((rede: any) => (
                            <a key={rede.key} href={rede.url} target="_blank" rel="noopener noreferrer" style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>{rede.icon}</a>
                        ))}
                    </div>
                    <div className="hide-mobile divisor-desktop" style={{ width: '1px', height: '22px', backgroundColor: '#e2e8f0' }}></div>
                    
                    {/* Botão do menu sanduíche real para mobile */}
                    <button className="menu-sanduiche-mobile-btn" onClick={() => setMenuMobileAberto(true)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: config.corTextoCard, display: 'none', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                        <FiMenu size={16} /> Categorias
                    </button>

                    <div className="carrinho-topo-container" onClick={() => router.push(`/${slug}/carrinho`)} style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '8px', flexShrink: '0' }}>
                        <FiShoppingCart size={26} color={config.corTextoCard} />
                        {totalCarrinho > 0 && (
                            <span style={{ position: 'absolute', top: '0px', right: '0px', backgroundColor: config.corPrimaria, color: config.corSecundaria, fontSize: '10px', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                {totalCarrinho}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            {/* CONTAINER GLOBAL CENTRALIZADO */}
            <div style={{ maxWidth: '1300px', margin: '20px auto 0', padding: '0 15px', boxSizing: 'border-box' }}>

                {/* LINHA SUPERIOR COM ALTURA FIXA IGUAL PARA AMBAS */}
                <div style={{ display: 'flex', alignItems: 'stretch', gap: '20px', width: '100%', boxSizing: 'border-box' }}>

                    {/* Sidebar de Categorias */}
                    <aside className="sidebar-categorias" style={{ width: '260px', height: '400px', backgroundColor: config.corSecundaria, borderRadius: '12px', padding: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                        <div style={{ backgroundColor: config.corPrimaria, color: '#fff', padding: '12px 15px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexShrink: 0 }}>
                            <FiGrid /> Categorias ({categorias.length})
                        </div>
                        <div className="lista-categorias-scroll" style={{ height: '335px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {categorias.length > 0 ? (
                                categorias.map((cat: any) => (
                                    <div key={cat.id} onClick={() => irParaCategoria(cat.nome)} style={{ padding: '10px 12px', fontSize: '13px', color: config.corTextoCard, borderRadius: '6px', cursor: 'pointer', textTransform: 'uppercase', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', flex: '1 1 auto' }}>
                                        {cat.nome}
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '10px', fontSize: '12px', color: '#999' }}>Carregando...</div>
                            )}
                        </div>
                    </aside>

                    {/* Main da Direita acompanha 100% da altura da sidebar de forma flexível */}
                    <main className="main-conteudo-topo" style={{ flex: 1, height: '400px', minWidth: 0, boxSizing: 'border-box', margin: 0, display: 'flex', overflow: 'hidden', backgroundColor: config.corFundoSite, borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                        <div style={{ width: '100%', height: '100%' }}>
                            {bannerTopo}
                        </div>
                    </main>
                </div>

                {/* MAIN 2 (Logo abaixo, ocupando a largura total de ponta a ponta) */}
                <div style={{ width: '100%', marginTop: '20px', boxSizing: 'border-box' }}>
                    {children}
                </div>

            </div>

            {/* BOTÃO FLUTUANTE DO WHATSAPP */}
            {linkWhatsappFlutuante && (
                <a
                    href={linkWhatsappFlutuante}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        position: 'fixed',
                        bottom: '25px',
                        right: '25px',
                        backgroundColor: '#25d366',
                        color: '#fff',
                        width: '55px',
                        height: '55px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 9999,
                        transition: 'transform 0.2s ease',
                        cursor: 'pointer'
                    }}
                    title="Fale conosco no WhatsApp"
                >
                    <FaWhatsapp size={32} />
                </a>
            )}

            {/* MODAL MOBILE */}
            {menuMobileAberto && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex' }}>
                    <div style={{ width: '280px', backgroundColor: config.corSecundaria, height: '100%', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '16px', color: config.corTextoCard }}>
                                <FiGrid color={config.corPrimaria} /> Menu
                            </div>
                            <button onClick={() => setMenuMobileAberto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><FiX size={24} /></button>
                        </div>
                        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                            {categorias.map((cat: any) => (
                                <div key={cat.id} onClick={() => irParaCategoria(cat.nome)} style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 'bold', color: config.corTextoCard, borderRadius: '8px', cursor: 'pointer', backgroundColor: '#f8fafc' }}>
                                    {cat.nome}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ flex: 1 }} onClick={() => setMenuMobileAberto(false)} />
                </div>
            )}

            <style jsx>{`
                .lista-categorias-scroll::-webkit-scrollbar { width: 5px; }
                .lista-categorias-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
                .lista-categorias-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

                @media (max-width: 1024px) {
                    .header-loja {
                        display: flex !important;
                        flex-direction: column !important;
                        height: auto !important;
                        padding: 10px 15px !important;
                        gap: 10px !important;
                    }

                    .header-loja > div:nth-child(1) {
                        width: 100% !important;
                        justify-content: space-between !important;
                    }
                    
                    .sidebar-categorias { display: none !important; }
                    
                    .search-box {
                        width: 100% !important;
                        order: 3 !important;
                        margin: 0 !important;
                        padding: 8px 16px !important;
                    }
                    
                    .header-actions-right {
                        width: 100% !important;
                        justify-self: auto !important;
                        order: 2 !important;
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        border-top: 1px solid #f1f5f9 !important;
                        padding-top: 8px !important;
                    }

                    .menu-sanduiche-mobile-btn { display: flex !important; }

                    .carrinho-topo-container {
                        order: 2 !important;
                    }

                    .divisor-desktop {
                        display: none !important;
                    }

                    .redes-sociais-desktop {
                        display: flex !important;
                        gap: 12px !important;
                    }

                    .logo-wrapper-header {
                        width: 35px !important;
                        height: 45px !important;
                    }
                    
                    .nome-loja-header span {
                        font-size: 13px !important;
                        max-width: 170px !important;
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                    }
                }
            `}</style>
        </div>
    );
}