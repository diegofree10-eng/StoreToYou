"use client";

import { useRouter } from "next/navigation";
import { FiZap, FiSmartphone, FiMessageCircle, FiCheck } from "react-icons/fi";

export default function LandingPageClient({ planosData }: { planosData: any }) {
    const router = useRouter();

    if (!planosData) return null;

    return (
        <div style={styles.container}>
            {/* NAVBAR */}
            <nav style={styles.topBar}>
                <div style={styles.logoBox}>
                    <img src="/logo.png" alt="Logo" style={{ height: '45px', width: 'auto', borderRadius: '8px' }} />
                    <span style={styles.logoText}>Store ToYou</span>
                </div>
                <button style={styles.loginBtn} onClick={() => router.push("/login")}>Acessar Painel</button>
            </nav>

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

                {/* Container forçado horizontalmente */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'stretch',
                    gap: '30px',
                    flexWrap: 'wrap'
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
        }
        .plan-card:hover { 
          transform: scale(1.05); border: 2px solid #055bb1 !important; box-shadow: 0 10px 20px rgba(0,0,0,0.1); 
        }
        .btn-assinar { 
          margin-top: auto; padding: 16px; border: none; borderRadius: 12px;
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
    hero: { padding: "80px 5%", textAlign: "center", background: "#f8fafc" },
    title: { fontSize: "48px", fontWeight: "900", marginBottom: "20px", lineHeight: "1.1" },
    highlight: { color: "#055bb1" },
    subtitle: { fontSize: "18px", color: "#64748b", maxWidth: "600px", margin: "0 auto 40px" },
    actions: { display: "flex", gap: "15px", justifyContent: "center" },
    mainBtn: { background: "#055bb1", color: "#fff", border: "none", padding: "16px 32px", borderRadius: "12px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" },
    secBtn: { background: "#e2e8f0", color: "#475569", border: "none", padding: "16px 32px", borderRadius: "12px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" },
    loginBtn: { background: "transparent", border: "1px solid #055bb1", color: "#055bb1", padding: "8px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
    features: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "30px", padding: "80px 5%", maxWidth: "1200px", margin: "0 auto" },
    featureCard: { padding: "40px", borderRadius: "20px", background: "#fff", border: "1px solid #f1f5f9", textAlign: "center" },
    pricing: { padding: "80px 5%", textAlign: "center", background: "#f8fafc" },
    sectionTitle: { fontSize: "32px", fontWeight: "800", marginBottom: "40px" },
    pricingGrid: { display: "flex", gap: "30px", justifyContent: "center", flexWrap: "wrap" },
    card: { padding: "40px", borderRadius: "20px", background: "#fff", width: "300px", position: "relative", textAlign: "center", border: "1px solid #e2e8f0" },
    badge: { position: "absolute", top: "-12px", background: "#f59e0b", color: "#fff", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" },
    price: { fontSize: "28px", fontWeight: "800", margin: "20px 0" },
    list: { listStyle: "none", padding: 0, textAlign: "left", marginBottom: "30px" },
    footer: { textAlign: "center", padding: "40px", color: "#94a3b8" }
};