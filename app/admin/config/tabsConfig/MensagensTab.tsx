"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { useTheme } from "@/context/ThemeContext";
import { FiMessageSquare, FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function MensagensTab({ config, lojistaId }: any) {
  const { theme, isModoNoturno } = useTheme();

  const [mensagensList, setMensagensList] = useState<any[]>([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 5;

  // Carrega o histórico de mensagens diretamente do Firestore e do config global
  useEffect(() => {
    if (!lojistaId) return;

    const mensagensRef = collection(db, "lojistas", lojistaId, "mensagens");
    const q = query(mensagensRef, orderBy("dataEnvio", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista: any[] = [];
      snapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        lista.push({
          id: docSnap.id,
          origem: "direcionada",
          ...dados
        });
      });

      const historicoGlobal = config?.historicoMensagens || [];
      const globais = historicoGlobal.map((m: any, index: number) => ({ 
        ...m, 
        id: m.id || `global-${index}-${m.data || m.titulo}`, 
        origem: "global" 
      }));
      
      // Une as mensagens direcionadas e globais evitando duplicidade por ID
      const unificadasMap = new Map();
      [...lista, ...globais].forEach(msg => {
        unificadasMap.set(msg.id, msg);
      });

      setMensagensList(Array.from(unificadasMap.values()));
    }, (error) => {
      console.error("Erro ao carregar mensagens:", error);
    });

    return () => unsubscribe();
  }, [lojistaId, config]);

  // Garante segurança contra valores nulos ou indefinidos
  const listaSegura = Array.isArray(mensagensList) ? mensagensList : [];

  const totalPaginas = Math.ceil(listaSegura.length / ITENS_POR_PAGINA) || 1;
  const inicioIndice = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const mensagensPaginadas = listaSegura.slice(inicioIndice, inicioIndice + ITENS_POR_PAGINA);

  return (
    <section style={{ 
      padding: '24px', 
      background: theme.bgCard, 
      borderRadius: '16px', 
      border: `1px solid ${theme.border}`,
      transition: 'background 0.3s, border 0.3s' 
    }}>
      
      {/* CABEÇALHO DA ABA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiMessageSquare size={18} color={theme.primary} />
          <h3 style={{ ...styles.h3, margin: 0, color: theme.textMain }}>Histórico de Comunicados</h3>
        </div>
        <div style={{ fontSize: '12px', color: theme.textSec, fontWeight: '600' }}>
          {listaSegura.filter((m: any) => !m.lida).length} não lidas (Total: {listaSegura.length})
        </div>
      </div>

      {/* LISTAGEM DE HISTÓRICO */}
      <div style={styles.msgContainer}>
        {mensagensPaginadas.length > 0 ? (
          mensagensPaginadas.map((msg: any) => {
            const corBordaEsquerda = msg.prioridade === 'alta' ? '#ef4444' : '#3b82f6';
            
            return (
              <div key={msg.id} style={{
                ...styles.msgItem,
                background: isModoNoturno ? theme.bgApp : '#f8fafc',
                border: `1px solid ${theme.border}`,
                borderLeft: `4px solid ${corBordaEsquerda}`,
                opacity: msg.lida ? 0.65 : 1
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '13px', color: theme.textMain }}>
                    {msg.titulo || 'Comunicado'}
                  </span>
                  <span style={{ fontSize: '11px', color: theme.textSec }}>
                    {msg.dataEnvio?.seconds 
                      ? new Date(msg.dataEnvio.seconds * 1000).toLocaleDateString('pt-BR') 
                      : msg.dataEnvio ? new Date(msg.dataEnvio).toLocaleDateString('pt-BR') : ''}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: theme.textSec, margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                  {msg.texto}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: msg.lida ? '#10b981' : '#f59e0b', textTransform: 'uppercase' }}>
                    {msg.lida ? '✓ Lida' : '● Pendente de Leitura'}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ ...styles.noMsg, color: theme.textSec }}>Nenhum comunicado registrado no momento.</div>
        )}
      </div>

      {/* CONTROLES DE PAGINAÇÃO */}
      {totalPaginas > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '15px', borderTop: `1px solid ${theme.border}` }}>
          <button
            onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))}
            disabled={paginaAtual === 1}
            style={{
              ...styles.pageBtn,
              opacity: paginaAtual === 1 ? 0.5 : 1,
              background: isModoNoturno ? theme.bgApp : '#f1f5f9',
              color: theme.textMain,
              border: `1px solid ${theme.border}`
            }}
          >
            <FiChevronLeft size={16} /> Anterior
          </button>

          <span style={{ fontSize: '12px', color: theme.textSec, fontWeight: '600' }}>
            Página {paginaAtual} de {totalPaginas}
          </span>

          <button
            onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))}
            disabled={paginaAtual === totalPaginas}
            style={{
              ...styles.pageBtn,
              opacity: paginaAtual === totalPaginas ? 0.5 : 1,
              background: isModoNoturno ? theme.bgApp : '#f1f5f9',
              color: theme.textMain,
              border: `1px solid ${theme.border}`
            }}
          >
            Próxima <FiChevronRight size={16} />
          </button>
        </div>
      )}
    </section>
  );
}

const styles: any = {
  h3: { fontSize: "13px", fontWeight: "800", textTransform: 'uppercase' },
  msgContainer: { display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' },
  noMsg: { textAlign: 'center', padding: '40px', fontSize: '13px' },
  msgItem: { padding: '20px', borderRadius: '12px', boxSizing: 'border-box' },
  pageBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }
};