"use client";

import { useState } from "react";
import { Trash2, Plus, Minus, Edit3, X } from "lucide-react";

export default function BlocoItensCarrinho({
  safeCart,
  config,
  requisitosDoBanco,
  personalizacoes,
  setPersonalizacoes,
  setItemQty,
  removeFromCart,
  lojistaSlug
}: any) {
  const [modalAbertoIdx, setModalAbertoIdx] = useState<number | null>(null);

  // 🔥 Função de máscara estrita de Horário 🔥
  const aplicarMascaraHora = (valorBruto: string): string => {
    let limpo = valorBruto.replace(/\D/g, "");
    if (limpo.length > 4) limpo = limpo.substring(0, 4);

    if (limpo.length >= 2) {
      let horas = parseInt(limpo.substring(0, 2), 10);
      if (horas > 23) horas = 23;
      limpo = String(horas).padStart(2, "0") + limpo.substring(2);
    }

    if (limpo.length === 4) {
      let minutos = parseInt(limpo.substring(2, 4), 10);
      if (minutos > 59) minutos = 59;
      limpo = limpo.substring(0, 2) + String(minutos).padStart(2, "0");
    }

    if (limpo.length > 2) {
      return limpo.substring(0, 2) + ":" + limpo.substring(2);
    }
    return limpo;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 769px) {
          .btn-popup-personalizacao {
            display: none !important;
          }
          .conteudo-personalizacao-inline {
            display: flex !important;
          }
        }
        @media (max-width: 768px) {
          .bloco-itens-carrinho-container {
            height: 350px !important;
            max-height: 350px !important;
          }
          .conteudo-personalizacao-inline {
            display: none !important;
          }
          .btn-popup-personalizacao {
            display: flex !important;
          }
        }
      `}} />

      <div style={{
        background: '#fff', 
        borderRadius: '16px', 
        padding: '20px', 
        boxSizing: 'border-box', 
        width: '100%', 
        border: '1px solid #f1f5f9',
        height: '350px',
        maxHeight: '350px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }} className="bloco-itens-carrinho-container">
        <h4 style={{ color: config.corTexto, margin: '0 0 15px 0', fontSize: '15px', fontWeight: 'bold' }}>ITENS NO CARRINHO</h4>
        
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '6px', boxSizing: 'border-box' }}>
          {safeCart.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', margin: '60px 0' }}>Seu carrinho está vazio.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {safeCart.map((item: any, idx: number) => {
                const chaveUnica = `${item.cartItemId || item.id || 'prod'}_${idx}`;
                const precoUnit = Number(item.preco || item.price || 0);
                const qtd = Number(item.qty || 1);
                const requisitosProduto = requisitosDoBanco[item.id] || [];
                const temRequisitos = Array.isArray(requisitosProduto) && requisitosProduto.length > 0;
                const isDigital = item.envioTransportadora === false && item.permiteRetirada === false;

                return (
                  <div key={chaveUnica} style={{ display: 'flex', flexDirection: 'column', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '10px', backgroundColor: '#f1f5f9', overflow: 'hidden', flexShrink: 0 }}>
                        {item.foto || item.imagem || item.url ? (
                          <img src={item.foto || item.imagem || item.url} alt={item.dsNomeProduto || item.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '20px' }}>📦</div>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h5 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 'bold', color: config.corTexto, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.dsNomeProduto || item.nome || "Produto"}
                        </h5>
                        <span style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: config.corPrimaria, marginBottom: '2px' }}>
                          R$ {precoUnit.toFixed(2).replace('.', ',')}
                        </span>
                        <span style={{ display: 'block', fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.variacao && item.variacao !== "Padrão" ? `Variação: ${item.variacao}` : ""}
                          {item.selectedCor ? ` • Cor: ${item.selectedCor}` : ""}
                          {item.selectedTamanho ? ` • Tam: ${item.selectedTamanho}` : ""}
                        </span>

                        {isDigital && (
                          <span style={{ 
                            display: 'inline-block', 
                            backgroundColor: '#e0f2fe', 
                            color: '#0369a1', 
                            fontSize: '10px', 
                            fontWeight: 'bold', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            marginTop: '4px' 
                          }}>
                            💻 Produto Digital (Envio por E-mail)
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => {
                            const chaveReal = item.cartItemKey || item.cartItemId || item.id;
                            setItemQty(chaveReal, Math.max(1, qtd - 1));
                          }}
                          style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', width: '16px', textAlign: 'center' }}>{qtd}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const chaveReal = item.cartItemKey || item.cartItemId || item.id;
                            setItemQty(chaveReal, qtd + 1);
                          }}
                          style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const chaveReal = item.cartItemKey || item.cartItemId || item.id;
                            removeFromCart(chaveReal);
                          }}
                          style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: '#fee2e2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '4px' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* BOTÃO PARA ABRIR O POPUP NO MOBILE */}
                    {temRequisitos && (
                      <button
                        type="button"
                        onClick={() => setModalAbertoIdx(idx)}
                        className="btn-popup-personalizacao"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${config.corPrimaria}`,
                          background: '#fff',
                          color: config.corPrimaria,
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxSizing: 'border-box'
                        }}
                      >
                        <Edit3 size={14} />
                        Preencher dados de personalização
                      </button>
                    )}

                    {/* RENDERIZAÇÃO INLINE (PADRÃO PC) */}
                    {temRequisitos && (
                      <div className="conteudo-personalizacao-inline" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', width: '100%', boxSizing: 'border-box', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: config.corTexto, marginBottom: '6px' }}>
                          ✏️ Preencha os dados de personalização:
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {requisitosProduto.map((req: any) => {
                            const campoId = String(req.id || req.nome || Math.random());
                            const labelCampo = req.nome || req.label || "Campo";
                            const valorAtual = personalizacoes[chaveUnica]?.[campoId] || "";
                            const tipoCampo = req.tipo || "text";

                            return (
                              <div key={campoId} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <label style={{ fontSize: '10px', fontWeight: '600', color: '#64748b' }}>
                                  {labelCampo} {req.obrigatorio ? "*" : ""}
                                </label>
                                <input
                                  type={tipoCampo === "date" ? "date" : "text"}
                                  maxLength={tipoCampo === "time" ? 5 : undefined}
                                  placeholder={tipoCampo === "time" ? "Ex: 14:30" : `Digite ${labelCampo.toLowerCase()}...`}
                                  value={valorAtual}
                                  onChange={(e) => {
                                    let valorDigitado = e.target.value;
                                    if (tipoCampo === "time") {
                                      valorDigitado = aplicarMascaraHora(valorDigitado);
                                    }
                                    setPersonalizacoes((prev: any) => {
                                      const novoEstado = {
                                        ...prev,
                                        [chaveUnica]: {
                                          ...(prev[chaveUnica] || {}),
                                          [campoId]: valorDigitado
                                        }
                                      };
                                      if (typeof window !== "undefined" && lojistaSlug) {
                                        localStorage.setItem(`pers_${lojistaSlug}`, JSON.stringify(novoEstado));
                                      }
                                      return novoEstado;
                                    });
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '11px',
                                    outline: 'none',
                                    backgroundColor: '#fff',
                                    color: '#1e293b',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* POPUP / MODAL EXCLUSIVO PARA O MOBILE */}
                    {modalAbertoIdx === idx && (
                      <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px',
                        boxSizing: 'border-box'
                      }}>
                        <div style={{
                          backgroundColor: '#fff',
                          borderRadius: '16px',
                          padding: '20px',
                          width: '100%',
                          maxWidth: '400px',
                          boxSizing: 'border-box',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '15px',
                          maxHeight: '90vh',
                          overflowY: 'auto'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: config.corTexto }}>Personalização do Produto</h4>
                            <button
                              type="button"
                              onClick={() => setModalAbertoIdx(null)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                            >
                              <X size={18} />
                            </button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {requisitosProduto.map((req: any) => {
                              const campoId = String(req.id || req.nome || Math.random());
                              const labelCampo = req.nome || req.label || "Campo";
                              const valorAtual = personalizacoes[chaveUnica]?.[campoId] || "";
                              const tipoCampo = req.tipo || "text";

                              return (
                                <div key={campoId} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                                    {labelCampo} {req.obrigatorio ? "*" : ""}
                                  </label>
                                  <input
                                    type={tipoCampo === "date" ? "date" : "text"}
                                    maxLength={tipoCampo === "time" ? 5 : undefined}
                                    placeholder={tipoCampo === "time" ? "Ex: 14:30" : `Digite ${labelCampo.toLowerCase()}...`}
                                    value={valorAtual}
                                    onChange={(e) => {
                                      let valorDigitado = e.target.value;
                                      if (tipoCampo === "time") {
                                        valorDigitado = aplicarMascaraHora(valorDigitado);
                                      }
                                      setPersonalizacoes((prev: any) => {
                                        const novoEstado = {
                                          ...prev,
                                          [chaveUnica]: {
                                            ...(prev[chaveUnica] || {}),
                                            [campoId]: valorDigitado
                                          }
                                        };
                                        if (typeof window !== "undefined" && lojistaSlug) {
                                          localStorage.setItem(`pers_${lojistaSlug}`, JSON.stringify(novoEstado));
                                        }
                                        return novoEstado;
                                      });
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '10px',
                                      borderRadius: '8px',
                                      border: '1px solid #cbd5e1',
                                      fontSize: '12px',
                                      outline: 'none',
                                      backgroundColor: '#f8fafc',
                                      color: '#1e293b',
                                      boxSizing: 'border-box'
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => setModalAbertoIdx(null)}
                            style={{
                              width: '100%',
                              padding: '10px',
                              borderRadius: '8px',
                              backgroundColor: config.corPrimaria,
                              color: '#fff',
                              border: 'none',
                              fontWeight: 'bold',
                              fontSize: '13px',
                              cursor: 'pointer',
                              marginTop: '5px'
                            }}
                          >
                            Salvar e Fechar
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

//Destinado à listagem dos produtos adicionados, gerenciamento de quantidades (+ / -),
// exclusão de itens e campos de personalização/requisitos vinculados aos produtos.