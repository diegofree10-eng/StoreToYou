"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useLoja } from "@/app/[lojista]/_components/LojaContext";
import LayoutPadrao from "@/app/[lojista]/_components/LayoutPadrao";

export default function ProdutoAgrupadoPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { dadosLoja, isLojaAberta } = useLoja();

  const slugLojista = params.lojista as string;
  const produtoId = params.id as string;

  const [produto, setProduto] = useState<any>(null);
  const [lojaDocId, setLojaDocId] = useState<string | null>(null);
  const [categoriasState, setCategoriasState] = useState<any[]>([]);
  const [imgAtiva, setImgAtiva] = useState("");
  const [v1Selecionada, setV1Selecionada] = useState("");
  const [v2Selecionada, setV2Selecionada] = useState("");
  const [variacaoFinal, setVariacaoFinal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDenuncia, setShowDenuncia] = useState(false);
  const [motivoDenuncia, setMotivoDenuncia] = useState("");
  const [enviandoDenuncia, setEnviandoDenuncia] = useState(false);

  const aparencia = dadosLoja?.aparencia || {};

  const config = {
    corDestaque: aparencia?.dscorPrincipal || "#6366f1",
    corSecundaria: aparencia?.dscorSecundaria || "#fdf5eb",
    corFundoSite: aparencia?.dscorFundo || "#f8fafc",
    corTextoDestaque: aparencia?.dscorTextoCard || "#1e293b",
    corSucesso: "#25D366"
  };

  const safeNumber = (value: any) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const atualizarContadorCarrinho = useCallback(() => {
    if (!slugLojista) return;
    const key = `carrinho_${slugLojista}`;
    const salvo = localStorage.getItem(key);
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        const itens = Array.isArray(parsed) ? parsed : (parsed?.items || []);
        itens.reduce((acc: number, item: any) => acc + safeNumber(item.qty || item.quantidade || 0), 0);
      } catch (err) {
        // Ignora erro
      }
    }
  }, [slugLojista]);

  useEffect(() => {
    async function carregarProdutoECategorias() {
      if (!slugLojista || !produtoId) return;

      try {
        const { getDocs, query, where, limit } = await import("firebase/firestore");
        const q = query(collection(db, "lojistas"), where("dadosLoja.dsSlug", "==", slugLojista), limit(1));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const docLoja = snap.docs[0];
          setLojaDocId(docLoja.id);

          const catsSnap = await getDocs(collection(db, "lojistas", docLoja.id, "categorias"));
          setCategoriasState(catsSnap.docs.map(c => ({ id: c.id, ...c.data() })));

          const prodRef = doc(db, "lojistas", docLoja.id, "produtos", produtoId);
          const prodSnap = await getDoc(prodRef);

          if (prodSnap.exists()) {
            setProduto({ id: prodSnap.id, ...prodSnap.data() });
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    carregarProdutoECategorias();
  }, [slugLojista, produtoId]);

  useEffect(() => {
    if (produto?.capa) setImgAtiva(produto.capa);
  }, [produto]);

  useEffect(() => {
    if (slugLojista) atualizarContadorCarrinho();
  }, [slugLojista, atualizarContadorCarrinho]);

  const handleDenuncia = async () => {
    if (!motivoDenuncia.trim()) return alert("Por favor, descreva o motivo.");
    setEnviandoDenuncia(true);
    try {
      await addDoc(collection(db, "denuncias"), {
        lojaId: lojaDocId,
        produtoId: produtoId,
        motivo: motivoDenuncia,
        data: serverTimestamp()
      });
      alert("Denúncia enviada!");
      setShowDenuncia(false);
      setMotivoDenuncia("");
    } catch (e) {
      console.error(e);
    } finally {
      setEnviandoDenuncia(false);
    }
  };

  const imagensGaleria = useMemo(() => {
    if (!produto) return [];
    const setImagens = new Set<string>();
    if (produto.capa) setImagens.add(produto.capa);
    if (produto.imagens && Array.isArray(produto.imagens)) {
      produto.imagens.forEach((img: string) => { if (img) setImagens.add(img); });
    }
    return Array.from(setImagens);
  }, [produto]);

  useEffect(() => {
    if (!produto?.variacoes || !v1Selecionada) return;
    const match = produto.variacoes.find((v: any) => {
      const val1 = (v.v1 || v.sabor || v.cor || v.modelo || "").trim().toLowerCase();
      const bateV1 = val1 === v1Selecionada.toLowerCase();
      if (!produto.nomeVar2) return bateV1;
      const val2 = (v.v2 || v.tamanho || v.quantidade || "").trim().toLowerCase();
      return bateV1 && val2 === v2Selecionada.toLowerCase();
    });
    setVariacaoFinal(match || null);
  }, [v1Selecionada, v2Selecionada, produto]);

  const listaOpcoesV1 = useMemo(() => {
    if (!produto?.variacoes) return [];
    const vistas = new Set();
    return produto.variacoes.filter((v: any) => {
      const valor = (v.v1 || v.sabor || v.cor || v.modelo || "").trim();
      if (!valor || vistas.has(valor.toLowerCase())) return false;
      vistas.add(valor.toLowerCase());
      return true;
    });
  }, [produto?.variacoes]);

  const listaOpcoesV2 = useMemo(() => {
    if (!v1Selecionada || !produto?.variacoes) return [];
    const sub = produto.variacoes.filter((v: any) =>
      (v.v1 || v.sabor || v.cor || v.modelo || "").trim().toLowerCase() === v1Selecionada.toLowerCase()
    );
    const vistas = new Set();
    return sub.map((v: any) => (v.v2 || v.tamanho || v.quantidade || "").trim()).filter((v: string) => {
      if (!v || vistas.has(v.toLowerCase())) return false;
      vistas.add(v.toLowerCase());
      return true;
    });
  }, [v1Selecionada, produto?.variacoes]);

  const podeAdicionar = useMemo(() => {
    if (!isLojaAberta) return false;
    if (!produto) return false;
    if (produto.nomeVar1 && !v1Selecionada) return false;
    if (produto.nomeVar2 && listaOpcoesV2.length > 0 && !v2Selecionada) return false;
    return true;
  }, [produto, v1Selecionada, v2Selecionada, listaOpcoesV2, isLojaAberta]);

  const handleAdicionar = () => {
    if (!isLojaAberta) {
      alert("Loja em férias! Pedidos temporariamente desativados.");
      return;
    }
    if (!podeAdicionar || !slugLojista || !produto) return;

    const key = `carrinho_${slugLojista}`;
    const salvo = localStorage.getItem(key);

    let dadosExistentes: any = { items: [] };
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        dadosExistentes = Array.isArray(parsed) ? { items: parsed } : (parsed?.items ? parsed : { items: [] });
      } catch (e) {
        dadosExistentes = { items: [] };
      }
    }

    const cartItemKey = `${produtoId}_${v1Selecionada || "padrao"}_${v2Selecionada || "padrao"}`;
    const skuParaSalvar = variacaoFinal ? variacaoFinal.sku : (produto.sku || "SEM-SKU");
    const novoItem = {
      cartItemKey,
      id: produtoId,
      sku: skuParaSalvar,
      nome: produto.nome,
      preco: variacaoFinal ? Number(variacaoFinal.preco) : Number(produto.precoBasico || 0),
      variacao: v1Selecionada + (v2Selecionada ? ` / ${v2Selecionada}` : ""),
      nomeVar1: produto.nomeVar1 || null,
      v1: v1Selecionada || null,
      nomeVar2: produto.nomeVar2 || null,
      v2: v2Selecionada || null,
      imagem: imgAtiva || produto.capa,
      quantidade: 1,
      qty: 1,
      requisitos: produto.requisitos || {},
      permiteRetirada: !!produto.permiteRetirada,
      envioTransportadora: !!produto.envioTransportadora,
      precisaFrete: !!produto.precisaFrete,
      peso: produto.peso || 0.3
    };

    const idx = dadosExistentes.items.findIndex((i: any) => i.cartItemKey === cartItemKey);
    const existingItems = Array.isArray(dadosExistentes.items) ? dadosExistentes.items : [];
    if (idx > -1) {
      existingItems[idx].quantidade += 1;
      existingItems[idx].qty += 1;
    } else {
      existingItems.push(novoItem);
    }
    dadosExistentes.items = existingItems;

    localStorage.setItem(key, JSON.stringify(dadosExistentes));
    addToCart(novoItem);

    alert("Produto adicionado ao carrinho!");
    atualizarContadorCarrinho();
  };

  if (loading) return <div style={styles.center}>Carregando...</div>;
  if (!produto) return <div style={styles.center}>Produto não encontrado.</div>;

  return (
    <LayoutPadrao
      categorias={categoriasState}
      bannerTopo={
        <div className="banner-topo-produto" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', height: '400px', maxHeight: '400px', boxSizing: 'border-box' }}>

          {/* Bloco Esquerdo: Minicards + Card Principal */}
          <div className="bloco-galeria-produto" style={{ display: 'flex', gap: '100px', height: '400px', alignItems: 'center', marginLeft: '15px' }}>

            {/* 1. Minicards na Vertical */}
            <div className="minicards-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '12px', width: '70px', height: '400px', flexShrink: 0 }}>
              {imagensGaleria.slice(0, 4).map((img: string, idx: number) => (
                <div
                  key={idx}
                  onClick={() => setImgAtiva(img)}
                  style={{
                    width: '100%',
                    height: '70px', // Deixamos a altura fixa proporcional para garantir o quadrado perfeito
                    minHeight: '70px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: imgAtiva === img ? `2px solid ${config.corDestaque}` : '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    flexShrink: 0
                  }}
                >
                  <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Miniatura" />
                </div>
              ))}
            </div>


            {/* 2. Card Principal com Imagem */}
            <div className="card-principal-foto" style={{ width: '400px', minWidth: '400px', maxWidth: '400px', height: '400px', maxHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', flexShrink: 0, overflow: 'hidden', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', padding: '10px' }}>
              <img src={imgAtiva || produto.capa} style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }} alt={produto.nome} />
            </div>

          </div>

          {/* 3. Quadro de Variações da Direita */}
          <div className="quadro-variacoes-produto" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '400px', maxHeight: '400px', width: '300px', minWidth: '300px', boxSizing: 'border-box', gap: '10px' }}>

            {/* Sub-main Superior: Informações e Variações */}
            <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '12px', padding: '18px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', boxSizing: 'border-box', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: config.corTextoDestaque, margin: 0, lineHeight: '1.2' }}>{produto.nome}</h1>
              <div style={{ fontSize: '24px', fontWeight: '800', color: config.corDestaque, margin: 0 }}>
                R$ {variacaoFinal ? variacaoFinal.preco : (produto.precoBasico || "0,00")}
              </div>

              {produto.nomeVar1 && (
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', marginBottom: '5px', margin: 0 }}>{produto.nomeVar1}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {listaOpcoesV1.map((item: any, i: number) => {
                      const valor = (item.v1 || item.sabor || item.cor || item.modelo || "").trim();
                      const ativo = v1Selecionada === valor;
                      return (
                        <div
                          key={i}
                          onClick={() => {
                            setV1Selecionada(valor);
                            console.log("DADOS DA VARIAÇÃO CLICADA:", item); // <--- Agora vai aparecer com certeza!
                            const fotoDesejada = item.foto || item.imagem || item.url || item.fotoCapa;
                            if (fotoDesejada) setImgAtiva(fotoDesejada);
                          }}
                          style={{ width: '50px', textAlign: 'center', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', backgroundColor: '#fff', border: ativo ? `2px solid ${config.corDestaque}` : '1px solid #ddd', padding: '2px' }}
                        >
                          <div style={{ width: '100%', height: '34px', borderRadius: '4px', overflow: 'hidden' }}>
                            {(item.foto || item.imagem || item.url) ? <img src={item.foto || item.imagem || item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={valor} /> : <div style={{ background: '#f0f0f0', height: '100%' }} />}
                          </div>
                          <span style={{ fontSize: '8px', padding: '1px 0', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{valor}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {produto.nomeVar2 && listaOpcoesV2.length > 0 && (
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', marginBottom: '5px', margin: 0 }}>{produto.nomeVar2}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {listaOpcoesV2.map((v: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => setV2Selecionada(v)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '12px',
                          border: '1px solid #ddd',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          backgroundColor: v2Selecionada === v ? config.corDestaque : '#fff',
                          borderColor: v2Selecionada === v ? config.corDestaque : '#ddd',
                          color: v2Selecionada === v ? 'white' : config.corTextoDestaque
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sub-main Inferior: Botão de Ação Isolado */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '12px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', boxSizing: 'border-box', flexShrink: 0 }}>
              <button
                disabled={!podeAdicionar || !isLojaAberta}
                onClick={handleAdicionar}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: (!isLojaAberta || !podeAdicionar) ? 'not-allowed' : 'pointer',
                  backgroundColor: !isLojaAberta ? '#94a3b8' : (podeAdicionar ? config.corDestaque : '#ccc'),
                  color: !isLojaAberta ? '#fff' : (podeAdicionar ? 'white' : '#666'),
                  transition: 'background-color 0.2s',
                  textAlign: 'center'
                }}
              >
                {!isLojaAberta
                  ? "PEDIDOS BLOQUEADOS"
                  : (podeAdicionar ? "ADICIONAR AO CARRINHO" : "SELECIONE AS OPÇÕES")
                }
              </button>
            </div>

          </div>

        </div>
      }
    >
      <div style={{ width: '100%', boxSizing: 'border-box' }}>
        <section style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #f1f5f9', boxSizing: 'border-box' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '10px', fontWeight: 'bold', color: config.corTextoDestaque }}>Descrição</h3>
          <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', whiteSpace: 'pre-wrap', margin: 0 }}>
            {produto.descricao || "Este lojista não adicionou uma descrição para este produto."}
          </p>
        </section>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box', position: 'relative', marginTop: '15px' }}>
          <button onClick={() => setShowDenuncia(!showDenuncia)} style={{ backgroundColor: '#333', color: 'white', border: 'none', width: '35px', height: '35px', borderRadius: '50%', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚠️</button>
          {showDenuncia && (
            <div style={{ position: 'absolute', bottom: '45px', left: '0px', backgroundColor: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', width: '220px', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 11, boxSizing: 'border-box', border: '1px solid #eee' }}>
              <textarea value={motivoDenuncia} onChange={(e) => setMotivoDenuncia(e.target.value)} placeholder="Motivo da denúncia..." style={{ width: '100%', height: '60px', padding: '5px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={handleDenuncia} disabled={enviandoDenuncia} style={{ backgroundColor: '#d93025', color: 'white', border: 'none', padding: '5px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>{enviandoDenuncia ? "..." : "Enviar"}</button>
                <button onClick={() => setShowDenuncia(false)} style={{ backgroundColor: '#ccc', border: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer' }}>X</button>
              </div>
            </div>
          )}
          <button onClick={() => router.push(`/${slugLojista}`)} style={{ backgroundColor: 'transparent', border: `1px solid ${config.corTextoDestaque}`, padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', color: config.corTextoDestaque }}>← Voltar ao Início</button>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1024px) {
          .banner-topo-produto {
            height: auto !important;
            max-height: none !important;
            flex-direction: column !important;
            gap: 20px !important;
          }
          .bloco-galeria-produto {
            width: 100% !important;
            height: auto !important;
            flex-direction: column !important; 
            gap: 15px !important;
            margin-left: 0 !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .card-principal-foto {
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            height: 350px !important;
            max-height: 350px !important;
            background-color: #f8fafc !important;
            order: 1 !important;
          }
          .minicards-container {
            width: 100% !important;
            height: 70px !important;
            flex-direction: row !important;
            justify-content: center !important; 
            align-items: center !important;
            gap: 10px !important;
            overflow-x: auto !important;
            margin: 0 auto !important;
            order: 2 !important; /* Mini cards ficam logo abaixo da foto */
          }
          .minicards-container > div {
            width: 60px !important;
            min-width: 60px !important;
          }
          .quadro-variacoes-produto {
            width: 100% !important;
            min-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            order: 3 !important; /* Quadro de variações e botão vêm por último */
          }
        }
      `}</style>
    </LayoutPadrao>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  center: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }
};