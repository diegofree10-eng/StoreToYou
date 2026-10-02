// app/admin/_tabsDashBoardLogista/TabClientes.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { FiChevronDown, FiChevronUp, FiDollarSign, FiTag, FiShoppingCart, FiAward, FiUsers, FiPhone } from "react-icons/fi";

export interface TabClientesProps {
  uid: string;
  formatarMoeda: (v: number) => string;
  clientesRanking?: any[]; 
  buscaNome?: string;
  styles?: any;
}

export const TabClientes = ({ uid, formatarMoeda, clientesRanking = [], buscaNome = "", styles = {} }: TabClientesProps) => {
  const { theme, isModoNoturno } = useTheme();
  
  // 🌟 Estado local inteligente: usa o que veio do pai, senão busca de segurança
  const [clientesEstado, setClientesEstado] = useState<any[]>(clientesRanking);
  const [loading, setLoading] = useState(false);
  const [linhaExpandidaId, setLinhaExpandidaId] = useState<string | null>(null);

  // Atualiza se o pai mandar novos dados
  useEffect(() => {
    if (clientesRanking && clientesRanking.length > 0) {
      setClientesEstado(clientesRanking);
    }
  }, [clientesRanking]);

  const dataHoje = new Date();
  const mesAtualIndex = dataHoje.getMonth();
  const anoAtualStr = dataHoje.getFullYear().toString();
  
  const nomesMesesFirestore = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];
  const mesAtualNome = nomesMesesFirestore[mesAtualIndex];

  // 🛡️ Fallback de segurança caso o pai não envie os dados de imediato
  useEffect(() => {
    if (clientesRanking && clientesRanking.length > 0) return;
    if (!uid) return;

    const carregarFallbackFirestore = async () => {
      setLoading(true);
      try {
        const chaveDocMes = `${mesAtualNome}_${anoAtualStr}`;
        const docRef = doc(db, "lojistas", uid, "dashboard_stats", chaveDocMes);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const dadosDoMes = snap.data();
          const listaClientes = dadosDoMes.clientesRankingTop || dadosDoMes.clientesRanking || [];
          setClientesEstado(listaClientes);
        }
      } catch (err) {
        console.error("Erro no fallback de clientes:", err);
      } finally {
        setLoading(false);
      }
    };

    carregarFallbackFirestore();
  }, [uid, mesAtualNome, anoAtualStr, clientesRanking]);

  const toggleExpandir = (id: string) => {
    setLinhaExpandidaId(linhaExpandidaId === id ? null : id);
  };

  // 🔍 Filtra os clientes dinamicamente conforme o que for digitado na busca do componente pai
  const clientesFiltradosBusca = useMemo(() => {
    if (!buscaNome) return clientesEstado;
    const termo = buscaNome.toLowerCase().trim();
    return clientesEstado.filter((c: any) => {
      const nome = String(c.nome || "").toLowerCase();
      const cpf = String(c.cpf || "").toLowerCase();
      const telefone = String(c.telefone || "").toLowerCase();
      return nome.includes(termo) || cpf.includes(termo) || telefone.includes(termo);
    });
  }, [clientesEstado, buscaNome]);

  // Ordenação por Valor Líquido de Compras do maior para o menor
  const clientesOrdenados = useMemo(() => {
    return [...clientesFiltradosBusca].sort((a: any, b: any) => (b.valorLiquidoCompras || b.total || 0) - (a.valorLiquidoCompras || a.total || 0));
  }, [clientesFiltradosBusca]);

  // 📊 Indicadores Calculados na Memória com base nos filtrados
  const indicadores = useMemo(() => {
    if (!clientesFiltradosBusca.length) return { topCliente: null, totalClientes: 0, totalVolume: 0 };

    const topCliente = clientesOrdenados[0] || null;
    const totalClientes = clientesFiltradosBusca.length;
    const totalVolume = clientesFiltradosBusca.reduce((acc, curr) => acc + Number(curr.valorLiquidoCompras || curr.total || 0), 0);

    return { topCliente, totalClientes, totalVolume };
  }, [clientesFiltradosBusca, clientesOrdenados]);

  return (
    <div style={{ width: '100%', overflowX: 'auto', backgroundColor: theme.bgCard, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', boxSizing: 'border-box' }}>
      
      {/* TÍTULO */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: theme.textMain }}>
          👥 Ranking e Comportamento de Clientes ({mesAtualNome.toUpperCase()} / {anoAtualStr})
        </h4>
        {buscaNome && (
          <span style={{ fontSize: '12px', color: theme.primary, fontWeight: '600' }}>
            Filtrando por: &quot;{buscaNome}&quot;
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: theme.textSec, fontSize: '13px' }}>
          ⏳ Carregando dados de clientes...
        </div>
      ) : (
        <>
          {/* 🚀 CARDS DE INDICADORES / DESTAQUES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            
            {/* Card 1: Melhor Cliente */}
            <div style={{ backgroundColor: theme.inputBg, padding: '12px 16px', borderRadius: '10px', border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: isModoNoturno ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe', color: '#3b82f6' }}>
                <FiAward size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: theme.textSec, fontWeight: 'bold', marginBottom: '2px' }}>PRINCIPAL CLIENTE</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                  {indicadores.topCliente ? (indicadores.topCliente.nome || indicadores.topCliente.id) : 'Nenhum'}
                </div>
                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>
                  {indicadores.topCliente ? formatarMoeda(indicadores.topCliente.valorLiquidoCompras || indicadores.topCliente.total || 0) : ''}
                </div>
              </div>
            </div>

            {/* Card 2: Total de Clientes no Top */}
            <div style={{ backgroundColor: theme.inputBg, padding: '12px 16px', borderRadius: '10px', border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: isModoNoturno ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7', color: '#10b981' }}>
                <FiUsers size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: theme.textSec, fontWeight: 'bold', marginBottom: '2px' }}>CLIENTES DESTAQUE</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: theme.textMain }}>
                  {indicadores.totalClientes} <span style={{ fontSize: '12px', fontWeight: 'normal', color: theme.textSec }}>registrados</span>
                </div>
              </div>
            </div>

            {/* Card 3: Volume Total Faturado dos Clientes */}
            <div style={{ backgroundColor: theme.inputBg, padding: '12px 16px', borderRadius: '10px', border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: isModoNoturno ? 'rgba(245, 158, 11, 0.2)' : '#fef9c3', color: '#f59e0b' }}>
                <FiDollarSign size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: theme.textSec, fontWeight: 'bold', marginBottom: '2px' }}>FATURAMENTO DO RANKING</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: theme.textMain }}>
                  {formatarMoeda(indicadores.totalVolume)}
                </div>
              </div>
            </div>

          </div>

          {/* TABELA */}
          <table style={{ width: '100%', borderCollapse: 'collapse', color: theme.textMain, backgroundColor: 'transparent', ...(styles.table || {}) }}>
            <thead>
              <tr style={{ ...(styles.thRow || {}), borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.inputBg }}>
                <th style={{ ...(styles.th || {}), padding: '12px', textAlign: 'left', fontSize: '13px', color: theme.textSec }}>Nome do Cliente</th>
                <th style={{ ...(styles.th || {}), padding: '12px', textAlign: 'left', fontSize: '13px', color: theme.textSec }}>Localidade</th>
                <th style={{ ...(styles.th || {}), padding: '12px', textAlign: 'left', fontSize: '13px', color: theme.textSec }}>Qtd de Pedidos</th>
                <th style={{ ...(styles.th || {}), padding: '12px', textAlign: 'left', fontSize: '13px', color: theme.textSec }}>Total Comprado (Líquido)</th>
                <th style={{ ...(styles.th || {}), padding: '12px', textAlign: 'center', fontSize: '13px', color: theme.textSec }}>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {clientesOrdenados.map((d: any, index: number) => {
                const itemId = d.id || d.cpf || d.nome || `cli_${index}`;
                const isExpandido = linhaExpandidaId === itemId;
                
                const nomeCliente = d.nome || "Cliente Sem Nome";
                const cpfCliente = d.cpf ? `CPF: ${d.cpf}` : "CPF não informado";
                const cidadeUf = d.cidade && d.uf ? `${d.cidade} - ${d.uf}` : (d.cidade || d.uf || "Localidade não informada");
                const telefoneCliente = d.telefone || "Não informado";
                const qtdPedidos = Number(d.totalPedidos || d.compras || 1);
                const qtdItensComprados = Number(d.numeroItensComprados || 0);
                const valorBruto = Number(d.valorBrutoCompras || d.total || 0);
                const totalCupom = Number(d.totalCupomAplicado || 0);
                const valorLiquido = Number(d.valorLiquidoCompras || d.total || 0);
                const lucroGerado = Number(d.lucroBrutoGerado || 0);

                return (
                  <React.Fragment key={itemId}>
                    {/* LINHA PRINCIPAL */}
                    <tr 
                      onClick={() => toggleExpandir(itemId)}
                      style={{ 
                        ...(styles.tr || {}), 
                        borderBottom: isExpandido ? 'none' : `1px solid ${theme.border}`, 
                        cursor: 'pointer', 
                        backgroundColor: isExpandido ? (isModoNoturno ? '#1e293b' : '#f8fafc') : 'transparent',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <td style={{ ...(styles.td || {}), padding: '14px 12px', fontSize: '13px', fontWeight: '600', color: theme.textMain }}>
                        👤 {nomeCliente}
                        <div style={{ fontSize: '11px', color: theme.textSec, fontWeight: 'normal' }}>{cpfCliente}</div>
                      </td>
                      <td style={{ ...(styles.td || {}), padding: '14px 12px', fontSize: '13px', color: theme.textSec }}>
                        📍 {cidadeUf}
                      </td>
                      <td style={{ ...(styles.td || {}), padding: '14px 12px', fontSize: '13px', color: theme.textMain }}>
                        {qtdPedidos} {qtdPedidos === 1 ? 'pedido' : 'pedidos'} {qtdItensComprados > 0 ? `(${qtdItensComprados} itens)` : ''}
                      </td>
                      <td style={{ ...(styles.td || {}), padding: '14px 12px', fontSize: '13px' }}>
                        <strong style={{ color: '#10b981' }}>{formatarMoeda(valorLiquido)}</strong>
                      </td>
                      <td style={{ ...(styles.td || {}), padding: '14px 12px', textAlign: 'center', color: theme.textSec }}>
                        {isExpandido ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                      </td>
                    </tr>

                    {/* RAIO-X DE COMPORTAMENTO DO CLIENTE (EXPANDIDO) */}
                    {isExpandido && (
                      <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <td colSpan={5} style={{ padding: '0 16px 16px 16px', backgroundColor: isModoNoturno ? '#1e293b' : '#f8fafc' }}>
                          <div style={{ 
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                            gap: '12px',
                            paddingTop: '4px'
                          }}>
                            {/* Card 1: Contato */}
                            <div style={{ background: isModoNoturno ? '#0f172a' : '#ffffff', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: theme.textSec, fontSize: '10px', fontWeight: 'bold' }}>
                                <FiPhone size={13} color="#3b82f6" /> CONTATO
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: '800', color: theme.textMain }}>
                                {telefoneCliente}
                              </div>
                            </div>

                            {/* Card 2: Valor Bruto & Descontos */}
                            <div style={{ background: isModoNoturno ? '#0f172a' : '#ffffff', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: theme.textSec, fontSize: '10px', fontWeight: 'bold' }}>
                                <FiTag size={13} color="#ef4444" /> BRUTO / CUPONS (-)
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: '800', color: theme.textMain }}>
                                {formatarMoeda(valorBruto)} <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'normal' }}>(-{formatarMoeda(totalCupom)})</span>
                              </div>
                            </div>

                            {/* Card 3: Lucro Bruto Gerado */}
                            <div style={{ background: isModoNoturno ? '#0f172a' : '#ffffff', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: theme.textSec, fontSize: '10px', fontWeight: 'bold' }}>
                                <FiDollarSign size={13} color="#10b981" /> LUCRO GERADO PARA A LOJA
                              </div>
                              <div style={{ fontSize: '15px', fontWeight: '800', color: '#10b981' }}>
                                {formatarMoeda(lucroGerado)}
                              </div>
                            </div>

                            {/* Card 4: Ticket Médio / Comportamento */}
                            <div style={{ background: isModoNoturno ? '#0f172a' : '#ffffff', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: theme.textSec, fontSize: '10px', fontWeight: 'bold' }}>
                                <FiShoppingCart size={13} color="#f59e0b" /> TICKET MÉDIO DO CLIENTE
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: '800', color: theme.textMain }}>
                                {formatarMoeda(qtdPedidos > 0 ? valorLiquido / qtdPedidos : 0)} por pedido
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              
              {clientesOrdenados.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: theme.textSec, backgroundColor: 'transparent', fontSize: '13px' }}>
                    {buscaNome ? `Nenhum cliente encontrado para "${buscaNome}".` : `Nenhum cliente registrado para o período de ${mesAtualNome}.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};