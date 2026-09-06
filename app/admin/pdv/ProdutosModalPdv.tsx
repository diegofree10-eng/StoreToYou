// app/admin/pdv/ProdutosModalPdv.tsx
"use client";
import React, { useEffect } from "react";
import { X, Search } from "lucide-react";

export default function ProdutosModalPdv({
  isOpen,
  onClose,
  produtos,
  buscaProduto,
  setBuscaProduto,
  categoriaSelecionada,
  setCategoriaSelecionada,
  categorias,
  lidarComCliqueProduto,
  formatarMoeda,
  theme
}: any) {
  
  // 🔍 Listener inteligente para capturar o código de barras ou SKU bipado pelo leitor
  useEffect(() => {
    if (!isOpen) return;

    let bufferCodigo = "";
    let ultimoTempo = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const tempoAtual = Date.now();
      
      // Se demorou mais de 100ms entre as teclas, reseta o buffer (evita conflito com digitação humana lenta)
      if (tempoAtual - ultimoTempo > 100) {
        bufferCodigo = "";
      }
      ultimoTempo = tempoAtual;

      if (e.key === "Enter") {
        if (bufferCodigo.trim().length > 1) {
          const codigoBipado = bufferCodigo.trim().toLowerCase();
          let produtoEncontrado = null;
          let variacaoEncontrada = null;

          // Varre os produtos cadastrados buscando correspondência por GTIN/EAN, SKU ou ID
          for (const p of produtos) {
            const eanPai = String(p.dsEANGTINProduto || "").trim().toLowerCase();
            const skuPai = String(p.dsSkuProduto || "").trim().toLowerCase();
            const idPai = String(p.id || "").trim().toLowerCase();

            // 1. Verifica se bateu no produto pai
            if (
              (eanPai && eanPai === codigoBipado) ||
              (skuPai && skuPai === codigoBipado) ||
              idPai === codigoBipado
            ) {
              produtoEncontrado = p;
              break;
            }

            // 2. Se o produto tem variações, verifica se o código bate em alguma variação específica
            if (p.isTemVariacoesProduto && Array.isArray(p.variacoes)) {
              const varMatch = p.variacoes.find((v: any) => {
                const eanVar = String(v.dsEANGTINProduto || "").trim().toLowerCase();
                const skuVar = String(v.dsSkuProduto || "").trim().toLowerCase();
                return (eanVar && eanVar === codigoBipado) || (skuVar && skuVar === codigoBipado);
              });

              if (varMatch) {
                produtoEncontrado = p;
                variacaoEncontrada = varMatch;
                break;
              }
            }
          }

          if (produtoEncontrado) {
            // Se encontrou uma variação específica pelo leitor, podemos passá-la ou tratá-la diretamente
            if (variacaoEncontrada) {
              // Se sua função aceitar variação direta ou abrir o modal já com ela selecionada
              lidarComCliqueProduto(produtoEncontrado, variacaoEncontrada);
            } else {
              lidarComCliqueProduto(produtoEncontrado);
            }
            onClose();
          }
          bufferCodigo = "";
        }
      } else if (e.key.length === 1) {
        bufferCodigo += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, produtos, lidarComCliqueProduto, onClose]);

  if (!isOpen) return null;

  const produtosFiltrados = produtos.filter((p: any) => {
    const categoriaProd = p.dsCategoriaProduto || p.categoria || "Sem Categoria";
    const atendeCategoria = categoriaSelecionada === "Todos" || categoriaProd === categoriaSelecionada;
    
    const nomeProd = p.dsNomeProduto || p.nome || "";
    const eanProd = p.dsEANGTINProduto || "";
    const skuProd = p.dsSkuProduto || "";
    
    const atendeBusca = 
      nomeProd.toLowerCase().includes(buscaProduto.toLowerCase()) || 
      eanProd.toLowerCase().includes(buscaProduto.toLowerCase()) ||
      skuProd.toLowerCase().includes(buscaProduto.toLowerCase());
    
    return atendeCategoria && atendeBusca;
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
      <div style={{ background: theme.bgCard, color: theme.textMain, border: `1px solid ${theme.border}`, width: "850px", maxWidth: "100%", height: "85vh", borderRadius: "14px", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}>
        
        {/* Cabeçalho do Modal */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${theme.border}` }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", textTransform: 'uppercase' }}>🛍️ Selecionar Produtos (Leitor de Código de Barras / SKU / Clique)</h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textSec }}>
            <X size={20} />
          </button>
        </div>

        {/* Filtros e Busca */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", gap: "12px", background: theme.bgApp }}>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: theme.textSec }} />
            <input
              type="text"
              placeholder="Digite o nome, SKU, EAN/GTIN ou use o leitor de código de barras..."
              value={buscaProduto}
              onChange={(e) => setBuscaProduto(e.target.value)}
              autoFocus
              style={{ width: "100%", padding: "10px 12px 10px 38px", borderRadius: "8px", border: `1px solid ${theme.border}`, fontSize: "13px", outline: "none", background: theme.inputBg, color: theme.textMain, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
            {categorias.map((cat: string) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaSelecionada(cat)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  background: categoriaSelecionada === cat ? theme.primary : theme.border,
                  color: categoriaSelecionada === cat ? "#fff" : theme.textSec,
                  transition: "all 0.2s"
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grade de Produtos */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px", overflowY: "auto", padding: "20px", flex: 1, alignContent: "start" }}>
          {produtosFiltrados.length === 0 ? (
            <p style={{ fontSize: "14px", color: theme.textSec, gridColumn: "1 / -1", textAlign: "center", padding: "40px" }}>Nenhum produto encontrado.</p>
          ) : (
            produtosFiltrados.map((p: any) => {
              const capaImg = p.dsCapaProduto || p.dsCapa || (p.dsImagensProduto?.[0]) || (p.dsImagens?.[0]) || "";
              const nomeProd = p.dsNomeProduto || p.nome || "Produto Sem Nome";
              const precoProd = p.vlPrecoBasicoProduto ?? p.vlPrecoBasico ?? p.preco ?? 0;

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    lidarComCliqueProduto(p);
                    onClose();
                  }}
                  style={{ border: `1px solid ${theme.border}`, padding: "10px", borderRadius: "10px", cursor: "pointer", textAlign: "center", background: theme.bgApp, transition: "transform 0.1s, border-color 0.2s", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
                >
                  {capaImg ? (
                    <img src={capaImg} alt={nomeProd} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "contain", background: theme.bgCard, borderRadius: "8px", marginBottom: "8px" }} />
                  ) : (
                    <div style={{ width: "100%", aspectRatio: "1 / 1", background: theme.border, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: theme.textSec, marginBottom: "8px" }}>Sem foto</div>
                  )}
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "12px", color: theme.textMain, marginBottom: "4px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{nomeProd}</div>
                    <div style={{ color: theme.primary, fontWeight: "700", fontSize: "13px" }}>{formatarMoeda(precoProd)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé do Modal */}
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${theme.border}`, textAlign: "right", background: theme.bgApp }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "8px 16px", borderRadius: "8px", background: theme.border, color: theme.textMain, border: "none", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}
          >
            Fechar e Voltar ao Caixa
          </button>
        </div>

      </div>
    </div>
  );
}