"use client";

import { useState } from "react";
import { Produto } from '@/types';
import { Trash2, Plus, Minus, Edit3 } from "lucide-react";
import CamposPersonalizacao from "@/app/[lojista]/_components/CamposPersonalizacao";
import ModalPersonalizacaoMobile from "./ModalPersonalizacaoMobile";

interface ItemCarrinhoProps {
  safeCart: Produto[];
  isLojaAberta: boolean;
  corPrimaria: string;
  corSecundaria: string;
  corTexto: string;
  requisitosDoBanco: Record<string, any>;
  personalizacoes: Record<string, Record<string, string>>;
  setItemQty: (key: string, qty: number) => void;
  removeFromCart: (key: string) => void;
  atualizarSubCampoPersonalizacao: (key: string, campoId: string, valorBruto: string) => void;
  isItemDigital: (item: any) => boolean;
}

export default function ItemCarrinho({
  safeCart,
  isLojaAberta,
  corPrimaria,
  corSecundaria,
  corTexto,
  requisitosDoBanco,
  personalizacoes,
  setItemQty,
  removeFromCart,
  atualizarSubCampoPersonalizacao,
  isItemDigital
}: ItemCarrinhoProps) {
  const [itemModalAberto, setItemModalAberto] = useState<string | null>(null);

  const verificarRequisitosValidos = (requisitosAtivos: any) => {
    if (!requisitosAtivos) return false;
    if (Array.isArray(requisitosAtivos)) return requisitosAtivos.some((r: any) => r && (r.label || r.id));
    if (typeof requisitosAtivos === "object") {
      return (requisitosAtivos.pedeNome || requisitosAtivos.pedeIdade || requisitosAtivos.pedeData || requisitosAtivos.pedeObs);
    }
    return false;
  };

  return (
    <div style={styles.card}>
      <h4 style={{ color: corTexto, margin: '0 0 15px 0', fontSize: '15px', fontWeight: 'bold' }}>ITENS NO CARRINHO</h4>
      {safeCart.length > 0 ? (
        safeCart.map((item: Produto, index: number) => {
          const key = item.cartItemKey || `item_${index}`;
          const partes = item.variacao ? item.variacao.split("/") : [];
          const requisitosAtivos = item.requisitos || requisitosDoBanco[item.id];
          const possuiRequisitosValidos = verificarRequisitosValidos(requisitosAtivos);
          const isDigital = isItemDigital(item);

          return (
            <div key={key} style={styles.itemRowContainer}>
              <div style={styles.itemRowMain}>
                <div style={{ width: '65px', height: '65px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  {(item.foto || item.imagem || item.url) ? (
                    <img src={item.foto || item.imagem || item.url} alt={item.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>
                  )}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <b style={{ color: corTexto, fontSize: '13px', wordBreak: 'break-word' }}>{item.nome || item.title}</b>
                    {isDigital && <span style={{ fontSize: '9px', padding: '2px 5px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1' }}>Digital</span>}
                  </div>
                  <span style={{ color: corPrimaria, fontSize: '14px', fontWeight: 'bold' }}>R$ {Number(item.preco || item.price || 0).toFixed(2).replace('.', ',')}</span>

                  <div style={{ marginTop: '4px' }}>
                    {item.variacao && item.variacao !== "Padrão" && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
                        {item.nomeVar1 && partes && partes[0] && <p style={styles.varText}><b>{item.nomeVar1}:</b> {partes[0].trim()}</p>}
                        {item.nomeVar2 && partes && partes[1] && <p style={styles.varText}><b>{item.nomeVar2}:</b> {partes[1].trim()}</p>}
                      </div>
                    )}

                    <div className="desktop-details-only">
                      {possuiRequisitosValidos && (
                        <div style={{ marginTop: '6px' }}>
                          <CamposPersonalizacao itemKey={key} requisitosAtivos={requisitosAtivos} personalizacoes={personalizacoes} corTexto={corTexto} onUpdateField={atualizarSubCampoPersonalizacao} />
                        </div>
                      )}
                    </div>
                  </div>

                  {possuiRequisitosValidos && (
                    <div className="mobile-btn-details-container" style={{ marginTop: '6px' }}>
                      <button 
                        onClick={() => setItemModalAberto(key)}
                        style={{
                          background: corSecundaria,
                          color: corPrimaria,
                          border: `1px solid ${corPrimaria}`,
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit3 size={12} /> Preencher Personalização
                      </button>
                    </div>
                  )}
                </div>

                <div style={styles.controls}>
                  <button disabled={!isLojaAberta} onClick={() => setItemQty(key, Math.max(1, Number(item.qty || 1) - 1))} style={styles.qtyBtn}><Minus size={13} /></button>
                  <span style={{ fontWeight: 'bold', minWidth: 16, textAlign: 'center', fontSize: '12px' }}>{item.qty || 1}</span>
                  <button disabled={!isLojaAberta} onClick={() => setItemQty(key, Number(item.qty || 1) + 1)} style={styles.qtyBtn}><Plus size={13} /></button>
                  <button onClick={() => removeFromCart(key)} style={styles.btnDel}><Trash2 size={16} /></button>
                </div>
              </div>

              {/* UTILIZANDO O COMPONENTE SEPARADO ModalPersonalizacaoMobile */}
              {itemModalAberto === key && (
                <ModalPersonalizacaoMobile 
                  itemKey={key}
                  item={item}
                  requisitosAtivos={requisitosAtivos}
                  personalizacoes={personalizacoes}
                  corPrimaria={corPrimaria}
                  corTexto={corTexto}
                  onClose={() => setItemModalAberto(null)}
                  onUpdateField={atualizarSubCampoPersonalizacao}
                />
              )}
            </div>
          );
        })
      ) : (
        <p style={{ textAlign: 'center', color: '#aaa', padding: '30px 0' }}>Seu carrinho está vazio.</p>
      )}

      <style jsx>{`
        .desktop-details-only {
          display: block;
        }
        .mobile-btn-details-container {
          display: none;
        }

        @media (max-width: 1024px) {
          .desktop-details-only {
            display: none !important;
          }
          .mobile-btn-details-container {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { background: '#fff', borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', boxSizing: 'border-box', width: '100%', border: '1px solid #f1f5f9' },
  itemRowContainer: { padding: '14px 0', borderBottom: '1px solid #f8fafc', width: '100%', boxSizing: 'border-box', position: 'relative' },
  itemRowMain: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, width: '100%', boxSizing: 'border-box' },
  varText: { margin: '2px 0 0', fontSize: 12, color: '#64748b', fontWeight: '500' },
  controls: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  qtyBtn: { background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', color: '#334155' },
  btnDel: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }
};