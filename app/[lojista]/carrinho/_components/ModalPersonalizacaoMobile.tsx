"use client";

import { X } from "lucide-react";
import CamposPersonalizacao from "@/app/[lojista]/_components/CamposPersonalizacao";

interface ModalPersonalizacaoMobileProps {
  itemKey: string;
  item: any;
  requisitosAtivos: any;
  personalizacoes: Record<string, Record<string, string>>;
  corPrimaria: string;
  corTexto: string;
  onClose: () => void;
  onUpdateField: (key: string, campoId: string, valorBruto: string) => void;
}

export default function ModalPersonalizacaoMobile({
  itemKey,
  item,
  requisitosAtivos,
  personalizacoes,
  corPrimaria,
  corTexto,
  onClose,
  onUpdateField
}: ModalPersonalizacaoMobileProps) {
  const verificarRequisitosValidos = (requisitos: any) => {
    if (!requisitos) return false;
    if (Array.isArray(requisitos)) return requisitos.some((r: any) => r && (r.label || r.id));
    if (typeof requisitos === "object") {
      return (requisitos.pedeNome || requisitos.pedeIdade || requisitos.pedeData || requisitos.pedeObs);
    }
    return false;
  };

  const possuiRequisitosValidos = verificarRequisitosValidos(requisitosAtivos);
  const partes = item?.variacao ? item.variacao.split("/") : [];

  return (
    <div className="mobile-modal-overlay">
      <div className="mobile-modal-content" style={{ borderColor: corPrimaria }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '12px' }}>
          <b style={{ fontSize: '14px', color: corTexto }}>Detalhes e Personalização</b>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {item?.variacao && item.variacao !== "Padrão" && (
            <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Variações Escolhidas:</span>
              {item.nomeVar1 && partes && partes[0] && <p style={{ margin: '2px 0', fontSize: '13px' }}><b>{item.nomeVar1}:</b> {partes[0].trim()}</p>}
              {item.nomeVar2 && partes && partes[1] && <p style={{ margin: '2px 0', fontSize: '13px' }}><b>{item.nomeVar2}:</b> {partes[1].trim()}</p>}
            </div>
          )}

          {possuiRequisitosValidos && (
            <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <CamposPersonalizacao 
                itemKey={itemKey} 
                requisitosAtivos={requisitosAtivos} 
                personalizacoes={personalizacoes} 
                corTexto={corTexto} 
                onUpdateField={onUpdateField} 
              />
            </div>
          )}
        </div>

        <button 
          onClick={onClose}
          style={{ width: '100%', marginTop: '15px', backgroundColor: corPrimaria, color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
        >
          Concluir / Fechar
        </button>
      </div>

      <style jsx>{`
        .mobile-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.5);
          z-index: 4000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          box-sizing: border-box;
        }
        .mobile-modal-content {
          background: #fff;
          width: 100%;
          max-width: 340px;
          border-radius: 14px;
          padding: 20px;
          box-sizing: border-box;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          border-top: 4px solid;
        }
      `}</style>
    </div>
  );
}