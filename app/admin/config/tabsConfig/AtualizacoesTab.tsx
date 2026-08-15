"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { FiGitCommit, FiCheckCircle } from "react-icons/fi";

export default function AtualizacoesTab({ config }: any) {
  const [versoes, setVersoes] = useState<any[]>([]);

  useEffect(() => {
    // Busca na coleção particionada ou padrão ordenada pelo novo campo de versão do sistema
    const q = query(collection(db, "historico_versoes_2026"), orderBy("nrVersaoSistemaSistema", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setVersoes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Aponta para o novo caminho na raiz do lojista: atualizacao.nrVersaoSistemaLogista
  const versaoAtualLoja = config?.atualizacao?.nrVersaoSistemaLogista || config?.sistema?.dsVersaoSistema || "0.0.0";

  return (
    <section>
      <div style={styles.headerBox}>
        <div>
          <h3 style={styles.h3}>Histórico de Atualizações do Sistema</h3>
          <p style={styles.helpText}>Acompanhe as melhorias, correções e novidades aplicadas na plataforma.</p>
        </div>
        <div style={styles.badgeVersaoAtual}>
          Sua Versão: <strong>{versaoAtualLoja}</strong>
        </div>
      </div>

      <div style={styles.timelineContainer}>
        {versoes.length === 0 ? (
          <p style={styles.emptyText}>Nenhum registro de atualização encontrado.</p>
        ) : (
          versoes.map((item) => {
            const versaoItem = item.nrVersaoSistemaSistema || item.versao;
            const isAtual = versaoItem === versaoAtualLoja;
            return (
              <div 
                key={item.id} 
                style={{
                  ...styles.cardVersao,
                  borderLeft: isAtual ? '4px solid #059669' : '4px solid #cbd5e1'
                }}
              >
                <div style={styles.versaoHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiGitCommit size={18} color={isAtual ? "#059669" : "#64748b"} />
                    <span style={styles.tituloVersao}>Versão {versaoItem}</span>
                    {item.nrVersaoSchemaSistema !== undefined && (
                      <span style={styles.badgeSchema}>Schema v{item.nrVersaoSchemaSistema}</span>
                    )}
                    {isAtual && <span style={styles.tagAtual}>Atual</span>}
                  </div>
                  <span style={styles.dataVersao}>{item.tsDataAtualizacao || item.data}</span>
                </div>

                <span style={styles.tipoVersao}>{item.dsPaginaAfetada || item.tipo}</span>

                <ul style={styles.listaMudancas}>
                  {(item.dsDescricao || item.mudancas)?.map((mudanca: string, idx: number) => (
                    <li key={idx} style={styles.itemMudanca}>
                      <FiCheckCircle size={14} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>{mudanca}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

const styles: any = {
  headerBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' },
  h3: { fontSize: "12px", fontWeight: "800", color: "#475569", marginBottom: "4px", textTransform: 'uppercase', marginTop: '10px' },
  helpText: { fontSize: '12px', color: '#64748b', margin: 0 },
  badgeVersaoAtual: { background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' },
  
  timelineContainer: { display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' },
  cardVersao: { background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' },
  versaoHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' },
  tituloVersao: { fontSize: '15px', fontWeight: '800', color: '#1e293b' },
  badgeSchema: { fontSize: '9px', fontWeight: '700', background: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' },
  tagAtual: { background: '#10b981', color: '#fff', fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase' },
  dataVersao: { fontSize: '12px', color: '#64748b', fontWeight: '600' },
  tipoVersao: { fontSize: '11px', color: '#3b82f6', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '12px' },
  
  listaMudancas: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' },
  itemMudanca: { display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#334155' },
  emptyText: { textAlign: 'center', color: '#64748b', fontSize: '13px', padding: '20px' }
};