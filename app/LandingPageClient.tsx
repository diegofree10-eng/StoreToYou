"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { FiZap, FiSmartphone, FiMessageCircle, FiCheck, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function LandingPageClient({ planosData }: { planosData: any }) {
    const router = useRouter();

    const [currentBanner, setCurrentBanner] = useState(0);
    const [banners, setBanners] = useState<string[]>([]);
    const [logoTipo, setLogoTipo] = useState<string>("/logo.png");

    // Buscar dados do Firebase (configuracoes -> sistema -> landPage -> banners)
    useEffect(() => {
        const carregarDadosLandPage = async () => {
            try {
                const docRef = doc(db, "configuracoes", "sistema", "landPage", "banners");
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.listaBanners && Array.isArray(data.listaBanners)) {
                        setBanners(data.listaBanners);
                    }
                    if (data.logoTipo) {
                        setLogoTipo(data.logoTipo);
                    }
                }
            } catch (error) {
                console.error("Erro ao carregar dados da landing page:", error);
            }
        };

        carregarDadosLandPage();
    }, []);

    // Rotação automática do banner
    useEffect(() => {
        if (banners.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentBanner((prev) => (prev + 1) % banners.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [banners.length]);

    if (!planosData) return null;

    return (
        <div style={styles.container}>
            {/* NAVBAR */}
            <nav style={styles.topBar}>
                <div style={styles.logoBox}>
                    <img src={logoTipo} alt="Logo" style={{ height: '45px', width: 'auto', borderRadius: '8px', objectFit: 'contain' }} />
                    <span style={styles.logoText}>Store ToYou</span>
                </div>
                <button style={styles.loginBtn} onClick={() => router.push("/login")}>Acessar Painel</button>
            </nav>

            {/* BANNER ROTATIVO */}
            <div style={styles.heroBannerSection}>
                <div style={styles.bannerContainer}>
                    {banners.length > 1 && (
                        <button
                            style={{ ...styles.bannerArrow, left: '15px' }}
                            onClick={() => setCurrentBanner((prev) => (prev === 0 ? banners.length - 1 : prev - 1))}
                        >
                            <FiChevronLeft size={24} />
                        </button>
                    )}

                    {banners.length > 0 && banners[currentBanner] ? (
                        <img
                            src={banners[currentBanner]}
                            alt={`Banner ${currentBanner + 1}`}
                            style={styles.bannerImage}
                        />
                    ) : (
                        <div style={styles.bannerImagePlaceholder}>
                            <span style={{ color: '#94a3b8', fontWeight: '600' }}>Banner {currentBanner + 1} (Insira a URL no Firebase)</span>
                        </div>
                    )}

                    {banners.length > 1 && (
                        <button
                            style={{ ...styles.bannerArrow, right: '15px' }}
                            onClick={() => setCurrentBanner((prev) => (prev + 1) % banners.length)}
                        >
                            <FiChevronRight size={24} />
                        </button>
                    )}

                    {banners.length > 1 && (
                        <div style={styles.dotsContainer}>
                            {banners.map((_, idx) => (
                                <span
                                    key={idx}
                                    style={{
                                        ...styles.dot,
                                        background: currentBanner === idx ? '#055bb1' : '#cbd5e1'
                                    }}
                                    onClick={() => setCurrentBanner(idx)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* HERO */}
            <header style={styles.hero}>
                <h1 style={styles.title}>
                    Transforme seus produtos com um <br />
                    <span style={styles.highlight}>Catálogo Digital Profissional</span>
                </h1>
                <p style={styles.subtitle}>
                    Aumente suas vendas com uma experiência de aplicativo no celular do seu cliente.
                </p>
                <div style={styles.actions}>
                    <button style={styles.mainBtn} onClick={() => router.push("/login")}>Começar Agora Grátis</button>
                    <button style={styles.secBtn} onClick={() => router.push("/festa-em-topo")}>Ver Exemplo Real</button>
                </div>
            </header>

            {/* BENEFÍCIOS */}
            <section style={styles.features}>
                <div style={styles.featureCard}>
                    <FiZap size={30} color="#2563eb" />
                    <h3>Venda Mais Rápido</h3>
                    <p>Organize produtos e elimine dúvidas com fotos e preços claros.</p>
                </div>
                <div style={styles.featureCard}>
                    <FiSmartphone size={30} color="#2563eb" />
                    <h3>Vitrine Profissional</h3>
                    <p>Visual de app com carregamento instantâneo que converte.</p>
                </div>
                <div style={styles.featureCard}>
                    <FiMessageCircle size={30} color="#2563eb" />
                    <h3>Pedidos no WhatsApp</h3>
                    <p>O pedido chega formatado e pronto para você produzir.</p>
                </div>
            </section>

            {/* PLANOS */}
            <section style={styles.pricing}>
                <h2 style={styles.sectionTitle}>Planos para o seu crescimento</h2>

                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'stretch',
                    gap: '30px',
                    flexWrap: 'wrap',
                    maxWidth: '1100px',
                    margin: '0 auto'
                }}>
                    {Object.keys(planosData)
                        .filter(key => key.toLowerCase() !== 'diamante')
                        .sort((a, b) => {
                            const ordem = ['bronze', 'prata', 'ouro'];
                            return ordem.indexOf(a.toLowerCase()) - ordem.indexOf(b.toLowerCase());
                        })
                        .map((key) => {
                            const plano = planosData[key];
                            const isOuro = key.toLowerCase() === 'ouro';

                            return (
                                <div key={key} className="plan-card" style={styles.card}>
                                    {isOuro && <div style={styles.badge}>MAIS VENDIDO</div>}

                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ textTransform: 'uppercase' }}>{key}</h3>
                                        <p style={styles.price}>R$ {plano.preco || 0}/mês</p>
                                        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
                                            ou R$ {plano.precoAnual || 0}/ano
                                        </p>

                                        <ul style={styles.list}>
                                            <li><FiCheck /> {plano.produtos || 0} produtos</li>
                                            <li><FiCheck /> {plano.categorias || 0} categorias</li>
                                            {plano.temMarketplace && <li><FiCheck /> Marketplace</li>}
                                            {plano.temLogistica && <li><FiCheck /> Cálculo de Frete</li>}
                                            {plano.temCupons && <li><FiCheck /> Cupons de desconto</li>}
                                            {plano.temSuporte && <li><FiCheck /> Suporte Master</li>}
                                            {plano.temPersonalizacao && <li><FiCheck /> Personalizar loja</li>}
                                            {plano.temLogistica && <li><FiCheck /> Melhor Envios</li>}
                                            {plano.modeloDash && <li><FiCheck /> DashBoard Profissional</li>}
                                            {plano.meios_pagamento && <li><FiCheck /> Api de Pagamentos</li>}
                                        </ul>
                                    </div>

                                    <button className="btn-assinar" onClick={() => router.push("/login")}>
                                        Assinar {key.toUpperCase()}
                                    </button>
                                </div>
                            );
                        })}
                </div>
            </section>

            <footer style={styles.footer}><p>© 2026 Store ToYou - Gestão Inteligente.</p></footer>

            <style jsx global>{`
                .plan-card { 
                  display: flex !important; flex-direction: column !important; 
                  transition: all 0.3s ease;
                  flex: 1;
                  min-width: 280px;
                  max-width: 340px;
                }
                .plan-card:hover { 
                  transform: scale(1.03); border: 2px solid #055bb1 !important; box-shadow: 0 10px 20px rgba(0,0,0,0.1); 
                }
                .btn-assinar { 
                  margin-top: auto; padding: 16px; border: none; border-radius: 12px;
                  font-weight: bold; cursor: pointer; background: #e2e8f0; color: #475569;
                  transition: all 0.3s ease;
                }
                .plan-card:hover .btn-assinar { background: #055bb1 !important; color: #fff !important; }
            `}</style>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: { background: "#fff", color: "#1e293b", fontFamily: "'Inter', sans-serif" },
    topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 5%", borderBottom: "1px solid #f1f5f9" },
    logoBox: { display: "flex", alignItems: "center", gap: "12px" },
    logoText: { fontSize: "20px", fontWeight: "800" },
    heroBannerSection: { padding: "40px 5% 20px 5%", background: "#f8fafc", display: "flex", justifyContent: "center" },
    bannerContainer: {
        position: 'relative',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '1100px',
        height: '380px',
        minHeight: '380px',
        maxHeight: '380px',
        background: '#f1f5f9',
        border: '2px dashed #cbd5e1',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto'
    },
    bannerImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block'
    },
    bannerImagePlaceholder: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%'
    },
    bannerArrow: {
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(255,255,255,0.9)',
        border: '1px solid #cbd5e1',
        color: '#1e293b',
        borderRadius: '50%',
        width: '45px',
        height: '45px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 3,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    dotsContainer: {
        position: 'absolute',
        bottom: '15px',
        display: 'flex',
        gap: '8px',
        zIndex: 3
    },
    dot: {
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        cursor: 'pointer',
        transition: 'background 0.3s'
    },
    hero: { padding: "40px 5%", textAlign: "center", background: "#fff" },
    title: { fontSize: "42px", fontWeight: "900", marginBottom: "20px", lineHeight: "1.1" },
    highlight: { color: "#055bb1" },
    subtitle: { fontSize: "18px", color: "#64748b", maxWidth: "600px", margin: "0 auto 40px" },
    actions: { display: "flex", gap: "15px", justifyContent: "center", flexWrap: "wrap" },
    mainBtn: { background: "#055bb1", color: "#fff", border: "none", padding: "16px 32px", borderRadius: "12px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" },
    secBtn: { background: "#e2e8f0", color: "#475569", border: "none", padding: "16px 32px", borderRadius: "12px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" },
    loginBtn: { background: "transparent", border: "1px solid #055bb1", color: "#055bb1", padding: "8px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
    features: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "30px", padding: "60px 5%", maxWidth: "1200px", margin: "0 auto" },
    featureCard: { padding: "40px", borderRadius: "20px", background: "#fff", border: "1px solid #f1f5f9", textAlign: "center" },
    pricing: { padding: "40px 5% 80px 5%", textAlign: "center", background: "#f8fafc" },
    sectionTitle: { fontSize: "32px", fontWeight: "800", marginBottom: "40px" },
    card: { padding: "40px 30px", borderRadius: "20px", background: "#fff", position: "relative", textAlign: "center", border: "1px solid #e2e8f0" },
    badge: { position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: "#f59e0b", color: "#fff", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" },
    price: { fontSize: "28px", fontWeight: "800", margin: "20px 0 5px 0" },
    list: { listStyle: "none", padding: 0, textAlign: "left", marginBottom: "30px" },
    footer: { textAlign: "center", padding: "40px", color: "#94a3b8" }
};