"use client";

import React, { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, getDocs, limit } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { FiTruck, FiShield, FiSmile, FiGrid } from "react-icons/fi";
import { useLoja } from "@/app/[lojista]/_components/LojaContext";
import LayoutPadrao from "@/app/[lojista]/_components/LayoutPadrao";
import BannerCarrossel from "@/app/[lojista]/_components/BannerCarrossel";

export default function HomeLoja() {
  const params = useParams();
  const router = useRouter();
  const { dadosLoja, isLojaAberta } = useLoja();
  const slug = params.lojista as string;

  const [produtosDestaque, setProdutosDestaque] = useState<any[]>([]);
  const [categoriasState, setCategoriasState] = useState<any[]>([]);

  const ap = dadosLoja?.aparencia || {};
  const config = {
    corPrimaria: ap?.dscorPrincipal || "#6366f1",
    corSecundaria: ap?.dscorSecundaria || "#fdf5eb",
    corTextoCard: ap?.dscorTextoCard || "#1e293b",
  };

  useEffect(() => {
    async function carregarDados() {
      if (!slug) return;
      try {
        const q = query(collection(db, "lojistas"), where("dadosLoja.dsSlug", "==", slug), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docId = snap.docs[0].id;

          const catsSnap = await getDocs(collection(db, "lojistas", docId, "categorias"));
          setCategoriasState(catsSnap.docs.map(c => ({ id: c.id, ...c.data() })));

          const prodRef = collection(db, "lojistas", docId, "produtos");
          onSnapshot(prodRef, (pSnap) => {
            setProdutosDestaque(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
    carregarDados();
  }, [slug]);

  // Extrai o objeto da loja com segurança
  const lojaObj = dadosLoja || {};

  return (
    <LayoutPadrao
      categorias={categoriasState}
      bannerTopo={<BannerCarrossel banners={lojaObj} slug={slug} />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', boxSizing: 'border-box' }}>

        {/* Beneficios */}
        <div className="beneficios-grid" style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', boxSizing: 'border-box' }}>
          {[
            { icon: <FiTruck size={20} color={config.corPrimaria} />, title: "Frete para todo o Brasil", desc: "Entrega garantida" },
            { icon: <FiShield size={20} color={config.corPrimaria} />, title: "Compra 100% segura", desc: "Ambiente protegido" },
            { icon: <FiSmile size={20} color={config.corPrimaria} />, title: "Satisfação garantida", desc: "Qualidade comprovada" },
            { icon: <FiGrid size={20} color={config.corPrimaria} />, title: "Parcele em até 12x", desc: "No cartão de crédito" }
          ].map((b, i) => (
            <div key={i} style={{ backgroundColor: config.corSecundaria, padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', boxSizing: 'border-box' }}>
              <div>{b.icon}</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: config.corTextoCard }}>{b.title}</h4>
                <span style={{ fontSize: '10px', color: '#64748b' }}>{b.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Vitrine de Produtos com Efeito */}
        <div style={{ marginTop: '10px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '15px', width: '100%' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: config.corTextoCard, textAlign: 'center' }}>Produtos em Destaque</h3>
          </div>

          <div className="grid-produtos-home">
            {produtosDestaque.length > 0 ? (
              produtosDestaque.map((prod: any) => (
                <div
                  key={prod.id}
                  onClick={() => router.push(`/${slug}/produto/${prod.id}`)}
                  className="card-produto-efeito"
                  style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', cursor: 'pointer', position: 'relative', boxSizing: 'border-box', border: '1px solid #f1f5f9' }}
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

        .grid-produtos-home {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 15px;
          box-sizing: border-box;
        }

        @media (max-width: 1200px) {
          .grid-produtos-home {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }

        @media (max-width: 1024px) {
          .beneficios-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .grid-produtos-home {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        /* 📱 CORREÇÃO EXCLUSIVA PARA MOBILE: Trava a altura do container do banner e das imagens */
        @media (max-width: 768px) {
          .beneficios-grid {
            grid-template-columns: 1fr !important;
          }
          .grid-produtos-home {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px;
          }

          /* Força o wrapper do banner a ter altura fixa no celular, impedindo saltos de layout */
          :global(.main-conteudo-topo) {
            height: 200px !important;
            min-height: 200px !important;
            max-height: 200px !important;
          }

          :global(.main-interno-wrapper), 
          :global(.main-interno-wrapper img),
          :global(.main-interno-wrapper div) {
            height: 100% !important;
            max-height: 200px !important;
            object-fit: cover !important;
          }
        }
      `}</style>
    </LayoutPadrao>
  );
}