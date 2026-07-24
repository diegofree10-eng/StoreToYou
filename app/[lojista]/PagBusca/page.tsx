"use client";

import React, { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FiSearch, FiPackage } from "react-icons/fi";
import { useLoja } from "@/app/[lojista]/_components/LojaContext";
import LayoutPadrao from "@/app/[lojista]/_components/LayoutPadrao";

export default function PagBusca() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { dadosLoja, isLojaAberta } = useLoja();
  const slug = params.lojista as string;
  const termoBusca = searchParams.get('q') || '';

  const [produtosResultado, setProdutosResultado] = useState<any[]>([]);
  const [categoriasState, setCategoriasState] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const ap = dadosLoja?.aparencia || {};
  const config = {
    corPrimaria: ap?.dscorPrincipal || "#6366f1",
    corSecundaria: ap?.dscorSecundaria || "#fdf5eb",
    corTextoCard: ap?.dscorTextoCard || "#1e293b",
  };

  useEffect(() => {
    async function buscarProdutosECategorias() {
      if (!slug) return;
      setCarregando(true);
      try {
        const qLoja = query(collection(db, "lojistas"), where("dadosLoja.dsSlug", "==", slug), limit(1));
        const snapLoja = await getDocs(qLoja);

        if (!snapLoja.empty) {
          const docId = snapLoja.docs[0].id;

          const catsSnap = await getDocs(collection(db, "lojistas", docId, "categorias"));
          setCategoriasState(catsSnap.docs.map(c => ({ id: c.id, ...c.data() })));

          const prodSnap = await getDocs(collection(db, "lojistas", docId, "produtos"));
          const todosProdutos = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));

          if (termoBusca) {
            const termoLimpo = termoBusca.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const palavrasChave = termoLimpo.split(" ").filter(Boolean);

            const filtrados = todosProdutos.filter((p: any) => {
              const nomeProd = (p.nome || p.dsNomeProduto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              const palavrasNome = nomeProd.split(/\s+/);

              // Se o termo for curto (ex: 1 ou 2 letras), exige que alguma palavra do título comece exatamente com o termo
              if (termoLimpo.length <= 2) {
                return palavrasNome.some((w: string) => w.startsWith(termoLimpo));
              }

              // Para termos maiores, exige que todas as palavras digitadas estejam presentes no título do produto
              return palavrasChave.every(palavraBusca => {
                return palavrasNome.some((w: string) => w.startsWith(palavraBusca) || w.includes(palavraBusca));
              });
            });

            setProdutosResultado(filtrados);
          } else {
            setProdutosResultado(todosProdutos);
          }
        }
      } catch (e) {
        console.error("Erro na busca:", e);
      } finally {
        setCarregando(false);
      }
    }

    buscarProdutosECategorias();
  }, [slug, termoBusca]);

  const produtosTopo = produtosResultado.slice(0, 4);
  const produtosBaixo = produtosResultado.slice(4);

  return (
    <LayoutPadrao
      categorias={categoriasState}
      bannerTopo={
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', height: '100%', boxSizing: 'border-box', gap: '8px' }}>

          {/* Caixa de Texto de Resultados */}
          <div
            style={{
              width: '100%',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              padding: '10px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxSizing: 'border-box',
              border: '1px solid #f1f5f9',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              flexShrink: 0
            }}
          >
            <h2 style={{ fontSize: '13px', fontWeight: '900', color: config.corTextoCard, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FiSearch size={14} color={config.corPrimaria} /> Busca: &quot;{termoBusca}&quot;
            </h2>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
              {carregando ? "Buscando..." : `${produtosResultado.length} ${produtosResultado.length === 1 ? 'produto encontrado' : 'produtos encontrados'}`}
            </span>
          </div>

          {/* Grid dos 4 Cards do Topo */}
          {produtosTopo.length > 0 && (
            <div className="grid-topo-busca" style={{ width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
              {produtosTopo.map((prod: any) => (
                <div
                  key={prod.id}
                  onClick={() => router.push(`/${slug}/produto/${prod.id}`)}
                  className="card-produto-efeito"
                  style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', cursor: 'pointer', position: 'relative', boxSizing: 'border-box', border: '1px solid #f1f5f9' }}
                >
                  <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#f1f5f9', borderRadius: '6px', overflow: 'hidden', marginBottom: '6px' }}>
                    <img src={prod.capa || "https://via.placeholder.com/400"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={prod.nome} />
                  </div>
                  <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: config.corTextoCard, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.nome}</h4>
                  <p style={{ fontSize: '13px', fontWeight: '900', color: config.corPrimaria, margin: '0 0 6px' }}>R$ {prod.precoBasico || "0,00"}</p>
                  <button style={{ width: '100%', backgroundColor: isLojaAberta ? config.corPrimaria : '#94a3b8', color: '#fff', border: 'none', padding: '6px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: 'auto' }}>
                    {isLojaAberta ? "Ver Detalhes" : "Apenas Vitrine"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Faixa inferior de acabamento alinhada perfeitamente */}
          <div style={{ width: '100%', minHeight: '12px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #f1f5f9', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', boxSizing: 'border-box', flexShrink: 0 }} />

        </div>
      }
    >
      {/* PARTE DE BAIXO: Restante dos produtos mantendo exatamente 5 cards por linha */}
      <div style={{ width: '100%', boxSizing: 'border-box' }}>
        {carregando ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#888' }}>Carregando resultados...</div>
        ) : produtosResultado.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', color: '#888', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <FiPackage size={40} color="#cbd5e1" />
            <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: config.corTextoCard }}>Nenhum produto encontrado para &quot;{termoBusca}&quot;.</p>
            <span style={{ fontSize: '13px' }}>Tente pesquisar por outros termos ou navegue pelas categorias ao lado.</span>
          </div>
        ) : produtosBaixo.length > 0 ? (
          <div className="grid-produtos-baixo">
            {produtosBaixo.map((prod: any) => (
              <div
                key={prod.id}
                onClick={() => router.push(`/${slug}/produto/${prod.id}`)}
                className="card-produto-efeito"
                style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', cursor: 'pointer', position: 'relative', boxSizing: 'border-box', border: '1px solid #f1f5f9' }}
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
            ))}
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .card-produto-efeito {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .card-produto-efeito:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08) !important;
          z-index: 2;
        }

        .grid-topo-busca {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          box-sizing: border-box;
        }
        
        .grid-produtos-baixo {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 15px;
          box-sizing: border-box;
        }

        @media (max-width: 1200px) {
          .grid-topo-busca {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .grid-produtos-baixo {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }
        @media (max-width: 1024px) {
          .grid-topo-busca {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .grid-produtos-baixo {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 768px) {
          .grid-topo-busca {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px;
          }
          .grid-produtos-baixo {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px;
          }
        }
      `}</style>
    </LayoutPadrao>
  );
}