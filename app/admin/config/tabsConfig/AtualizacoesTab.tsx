"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { FiGitCommit, FiCheckCircle } from "react-icons/fi";

export default function AtualizacoesTab({ config, theme }: any) {
  const currentTheme = theme || {
    bgCard: "#ffffff",
    textMain: "#1e293b",
    textSec: "#64748b",
    border: "#e2e8f0",
    inputBg: "#ffffff",
    primary: "#2563eb"
  };

  const isDark = currentTheme.inputBg !== "#ffffff";

  const [versoes, setVersoes] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "historico_versoes_2026"), orderBy("nrVersaoSistemaSistema", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setVersoes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const versaoAtualLoja = config?.atualizacao?.nrVersaoSistemaLogista || config?.sistema?.dsVersaoSistema || "0.0.0";

  return (
    <section>
      <div style={styles.headerBox}>
        <div>
          <h3 style={{ ...styles.h3, color: currentTheme.textMain }}>Histórico de Atualizações do Sistema</h3>
          <p style={{ ...styles.helpText, color: currentTheme.textSec }}>Acompanhe as melhorias, correções e novidades aplicadas na plataforma.</p>
        </div>
        <div style={{ 
          ...styles.badgeVersaoAtual, 
          background: isDark ? '#064e3b' : '#ecfdf5', 
          color: isDark ? '#6ee7b7' : '#047857', 
          borderTop: `1px solid ${isDark ? '#065f46' : '#a7f3d0'}`,
          borderRight: `1px solid ${isDark ? '#065f46' : '#a7f3d0'}`,
          borderBottom: `1px solid ${isDark ? '#065f46' : '#a7f3d0'}`,
          borderLeft: `1px solid ${isDark ? '#065f46' : '#a7f3d0'}`
        }}>
          Sua Versão: <strong style={{ color: currentTheme.textMain }}>{versaoAtualLoja}</strong>
        </div>
      </div>

      <div style={styles.timelineContainer}>
        {versoes.length === 0 ? (
          <p style={{ ...styles.emptyText, color: currentTheme.textSec }}>Nenhum registro de atualização encontrado.</p>
        ) : (
          versoes.map((item) => {
            const versaoItem = item.nrVersaoSistemaSistema || item.versao;
            const isAtual = versaoItem === versaoAtualLoja;
            const corBordaEsquerda = isAtual ? '#059669' : '#cbd5e1';

            return (
              <div 
                key={item.id} 
                style={{
                  ...styles.cardVersao,
                  background: isDark ? '#0f172a' : '#f8fafc',
                  borderTop: `1px solid ${currentTheme.border}`,
                  borderRight: `1px solid ${currentTheme.border}`,
                  borderBottom: `1px solid ${currentTheme.border}`,
                  borderLeft: `4px solid ${corBordaEsquerda}`
                }}
              >
                <div style={styles.versaoHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiGitCommit size={18} color={isAtual ? "#059669" : currentTheme.textSec} />
                    <span style={{ ...styles.tituloVersao, color: currentTheme.textMain }}>Versão {versaoItem}</span>
                    {item.nrVersaoSchemaSistema !== undefined && (
                      <span style={styles.badgeSchema}>Schema v{item.nrVersaoSchemaSistema}</span>
                    )}
                    {isAtual && <span style={styles.tagAtual}>Atual</span>}
                  </div>
                  <span style={{ ...styles.dataVersao, color: currentTheme.textSec }}>{item.tsDataAtualizacao || item.data}</span>
                </div>

                <span style={{ ...styles.tipoVersao, color: currentTheme.primary }}>{item.dsPaginaAfetada || item.tipo}</span>

                <ul style={styles.listaMudancas}>
                  {(item.dsDescricao || item.mudancas)?.map((mudanca: string, idx: number) => (
                    <li key={idx} style={{ ...styles.itemMudanca, color: currentTheme.textSec }}>
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
  h3: { fontSize: "12px", fontWeight: "800", marginBottom: "4px", textTransform: 'uppercase', marginTop: '10px' },
  helpText: { fontSize: '12px', margin: 0 },
  badgeVersaoAtual: { padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' },
  
  timelineContainer: { display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' },
  cardVersao: { padding: '20px', borderRadius: '12px', boxSizing: 'border-box' },
  versaoHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' },
  tituloVersao: { fontSize: '15px', fontWeight: '800' },
  badgeSchema: { fontSize: '9px', fontWeight: '700', background: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' },
  tagAtual: { background: '#10b981', color: '#fff', fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase' },
  dataVersao: { fontSize: '12px', fontWeight: '600' },
  tipoVersao: { fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '12px' },
  
  listaMudancas: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' },
  itemMudanca: { display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px' },
  emptyText: { textAlign: 'center', fontSize: '13px', padding: '20px' }
};