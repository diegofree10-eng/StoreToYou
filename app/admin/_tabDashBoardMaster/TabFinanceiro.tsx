"use client";
import React, { useState, useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import { FiSearch, FiChevronDown, FiChevronUp, FiDollarSign, FiUser, FiShoppingBag } from "react-icons/fi";

interface TabFinanceiroProps {
  lojistas: any[];
}

export default function TabFinanceiro({ lojistas }: TabFinanceiroProps) {
  const { theme, isModoNoturno } = useTheme();

  const [expandido, setExpandido] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const formatarMoeda = (valor: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

  // Filtro inteligente: Nome da Loja, Nome do Responsável ou CPF
  const lojistasFiltrados = useMemo(() => {
    return lojistas.filter(loja => 
      loja.nomeLoja?.toLowerCase().includes(busca.toLowerCase()) ||
      loja.nomeResponsavel?.toLowerCase().includes(busca.toLowerCase()) ||
      loja.cpfResponsavel?.includes(busca)
    );
  }, [lojistas, busca]);

  return (
    <div style={{ ...styles.container, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
      <div style={styles.headerContainer}>
        <h2 style={{ ...styles.titulo, color: theme.textMain }}>Painel Financeiro de Lojistas</h2>
        <span style={{ ...styles.badgeTotal, background: isModoNoturno ? '#1e293b' : '#eff6ff', color: theme.primary, border: `1px solid ${theme.border}` }}>
          Total: {lojistasFiltrados.length} Lojas
        </span>
      </div>
      
      {/* Campo de Pesquisa */}
      <div style={{ ...styles.searchWrapper, background: theme.bgApp || theme.bgApp, border: `1px solid ${theme.border}` }}>
        <FiSearch color={theme.textSec} size={18} />
        <input 
          style={{ ...styles.inputBusca, color: theme.textMain }}
          placeholder="Pesquisar por nome da loja, dono ou CPF..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div style={{ ...styles.tableContainer, border: `1px solid ${theme.border}` }}>
        <table style={styles.table}>
          <thead>
            <tr style={{ ...styles.thRow, background: isModoNoturno ? '#0f172a' : '#f8fafc', borderBottom: `2px solid ${theme.border}` }}>
              <th style={{ ...styles.th, color: theme.textSec }}>NOME DA LOJA</th>
              <th style={{ ...styles.th, textAlign: 'right', color: theme.textSec }}>LUCRO LÍQUIDO REAL</th>
              <th style={{ ...styles.th, textAlign: 'right', color: theme.textSec }}>TICKET MÉDIO</th>
            </tr>
          </thead>
          <tbody>
            {lojistasFiltrados.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: theme.textSec }}>
                  Nenhum lojista encontrado.
                </td>
              </tr>
            ) : (
              lojistasFiltrados.map((loja, index) => {
                const isAberto = expandido === loja.id;
                const linhaPar = index % 2 === 0;

                return (
                  <React.Fragment key={loja.id}>
                    <tr 
                      style={{ 
                        ...styles.tr, 
                        background: isAberto 
                          ? (isModoNoturno ? '#1e293b' : '#eff6ff') 
                          : linhaPar ? (isModoNoturno ? '#0f172a' : '#ffffff') : (isModoNoturno ? '#111827' : '#fcfcfc'),
                        borderBottom: `1px solid ${theme.border}` 
                      }} 
                      onClick={() => setExpandido(isAberto ? null : loja.id)}
                    >
                      <td style={{ ...styles.tdLoja, color: theme.textMain }}>
                        <span style={{ ...styles.setaBox, background: isModoNoturno ? '#334155' : '#e2e8f0', color: theme.textMain }}>
                          {isAberto ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                        </span>
                        {loja.nomeLoja || "Loja sem nome"}
                      </td>
                      <td style={{ ...styles.tdFinanceiro, color: '#10b981', fontWeight: '800' }}>
                        {formatarMoeda(loja.lucroReal || 0)}
                      </td>
                      <td style={{ ...styles.tdFinanceiro, color: theme.textMain }}>
                        {formatarMoeda(loja.ticketMedio || 0)}
                      </td>
                    </tr>

                    {isAberto && (
                      <tr style={{ background: isModoNoturno ? '#0b0f19' : '#f1f5f9' }}>
                        <td colSpan={3} style={styles.tdExpandido}>
                          <div style={styles.boxGrid}>
                            
                            {/* DADOS PESSOAIS */}
                            <div style={{ ...styles.cardDetalhe, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
                              <h4 style={{ ...styles.boxTitle, color: theme.primary }}>
                                <FiUser size={14} /> DADOS PESSOAIS
                              </h4>
                              <div style={styles.detalheConteudo}>
                                <p style={{ ...styles.boxItem, color: theme.textSec }}><strong>Dono:</strong> <span style={{ color: theme.textMain }}>{loja.nomeResponsavel || "---"}</span></p>
                                <p style={{ ...styles.boxItem, color: theme.textSec }}><strong>CPF:</strong> <span style={{ color: theme.textMain }}>{loja.cpfResponsavel || "---"}</span></p>
                                <p style={{ ...styles.boxItem, color: theme.textSec }}><strong>E-mail:</strong> <span style={{ color: theme.textMain }}>{loja.emailPessoal || "---"}</span></p>
                                <p style={{ ...styles.boxItem, color: theme.textSec }}><strong>WhatsApp:</strong> <span style={{ color: theme.textMain }}>{loja.whatsapp || "---"}</span></p>
                              </div>
                            </div>
                            
                            {/* DADOS DA LOJA */}
                            <div style={{ ...styles.cardDetalhe, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
                              <h4 style={{ ...styles.boxTitle, color: theme.primary }}>
                                <FiShoppingBag size={14} /> DADOS DA LOJA
                              </h4>
                              <div style={styles.detalheConteudo}>
                                <p style={{ ...styles.boxItem, color: theme.textSec }}><strong>Plano:</strong> <span style={{ color: theme.textMain, fontWeight: 'bold' }}>{loja.plano || "Bronze"}</span></p>
                                <p style={{ ...styles.boxItem, color: theme.textSec }}><strong>Endereço:</strong> <span style={{ color: theme.textMain }}>{loja.ruaOrigem || "---"}, {loja.numeroOrigem || "---"}</span></p>
                                <p style={{ ...styles.boxItem, color: theme.textSec }}><strong>Bairro:</strong> <span style={{ color: theme.textMain }}>{loja.bairroOrigem || "---"}</span></p>
                                <p style={{ ...styles.boxItem, color: theme.textSec }}><strong>CEP/Cidade:</strong> <span style={{ color: theme.textMain }}>{loja.cepOrigem || "---"} - {loja.cidadeOrigem || "---"}/{loja.ufOrigem || "--"}</span></p>
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: "24px", borderRadius: "20px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" },
  headerContainer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' },
  titulo: { fontSize: "18px", fontWeight: "800", margin: 0 },
  badgeTotal: { fontSize: '11px', fontWeight: '700', padding: '6px 12px', borderRadius: '8px', textTransform: 'uppercase' },
  
  searchWrapper: { display: 'flex', alignItems: 'center', gap: '10px', padding: '0 14px', borderRadius: '12px', marginBottom: '20px' },
  inputBusca: { width: "100%", padding: "12px 0", background: 'transparent', border: "none", fontSize: "14px", outline: "none" },
  
  tableContainer: { borderRadius: '14px', overflow: 'hidden' },
  table: { width: "100%", borderCollapse: "collapse" },
  thRow: {},
  th: { padding: "14px 16px", textAlign: "left", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: '0.5px' },
  tr: { cursor: "pointer", transition: "background 0.2s" },
  tdLoja: { padding: "16px", fontWeight: "700", display: 'flex', alignItems: 'center', gap: '12px' },
  tdFinanceiro: { padding: "16px", textAlign: "right", fontSize: "14px" },
  setaBox: { width: '22px', height: '22px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  
  tdExpandido: { padding: "20px" },
  boxGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" },
  cardDetalhe: { padding: '16px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  boxTitle: { fontSize: "11px", fontWeight: "900", marginBottom: "12px", textTransform: "uppercase", display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' },
  detalheConteudo: { display: 'flex', flexDirection: 'column', gap: '6px' },
  boxItem: { fontSize: "13px", margin: 0 }
};