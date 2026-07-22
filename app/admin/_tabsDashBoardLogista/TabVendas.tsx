"use client";

import React, { useState, useMemo, useEffect } from "react";

interface TabVendasProps {
  pedidos: any[];
  formatarDataExibicao: (d: string) => string;
  formatarMoeda: (v: number) => string;
  alternarDevolucao: (id: string, status: boolean) => void;
  pedidoExpandido: string | null;
  setPedidoExpandido: (id: string | null) => void;
  LinhaPedido: any;
  styles: any;
}

export const TabVendas = ({ 
  pedidos, 
  formatarDataExibicao, 
  formatarMoeda, 
  alternarDevolucao, 
  pedidoExpandido, 
  setPedidoExpandido,
  LinhaPedido,
  styles 
}: TabVendasProps) => {

  const [buscaNome, setBuscaNome] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [pedidosPorPagina, setPedidosPorPagina] = useState(20);
  const [paginaAtual, setPaginaAtual] = useState(1);

  // Resetar página ao mudar filtros para não ficar preso em páginas vazias
  useEffect(() => {
    setPaginaAtual(1);
  }, [buscaNome, dataInicio, dataFim]);

  // Lógica de Filtro Interna
  const dadosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      const clienteNomeStr = (p.cliente && typeof p.cliente === 'object') ? String(p.cliente.nome || "") : String(p.cliente || "");
      const termoBusca = buscaNome.toLowerCase().trim();
      
      const matchBusca = clienteNomeStr.toLowerCase().includes(termoBusca) || String(p.numeroPedido).includes(termoBusca);
      
      const dataP = new Date(p.data);
      const matchInicio = !dataInicio || dataP >= new Date(dataInicio + "T00:00:00");
      const matchFim = !dataFim || dataP <= new Date(dataFim + "T23:59:59");
      
      return p.status?.toLowerCase() === 'concluído' && !p.devolvido && matchBusca && matchInicio && matchFim;
    });
  }, [pedidos, buscaNome, dataInicio, dataFim]);

  // Lógica de Paginação
  const totalPaginas = Math.ceil(dadosFiltrados.length / pedidosPorPagina);
  const pedidosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * pedidosPorPagina;
    return dadosFiltrados.slice(inicio, inicio + pedidosPorPagina);
  }, [dadosFiltrados, paginaAtual, pedidosPorPagina]);

  return (
    <>
      {/* Filtros Internos da Aba */}
      <div style={{...styles.filtrosCard, marginBottom: '20px'}}>
        <input 
          type="text" 
          placeholder="🔍 Buscar por nome ou pedido..." 
          value={buscaNome} 
          onChange={e => setBuscaNome(e.target.value)} 
          style={styles.input} 
        />
        <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={styles.inputDate} />
        <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={styles.inputDate} />
        <button onClick={() => {setBuscaNome(""); setDataInicio(""); setDataFim("");}} style={styles.btnLimpar}>Limpar</button>
      </div>

      <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <label style={{ fontSize: '13px' }}>Mostrar:</label>
        <select 
          value={pedidosPorPagina} 
          onChange={(e) => { setPedidosPorPagina(Number(e.target.value)); setPaginaAtual(1); }} 
          style={styles.input}
        >
          <option value={20}>20 pedidos</option>
          <option value={40}>40 pedidos</option>
          <option value={100}>100 pedidos</option>
        </select>
      </div>

      <table style={styles.table}>
        <thead>
          <tr style={styles.thRow}>
            <th style={styles.th}>Data</th>
            <th style={styles.th}>Pedido</th>
            <th style={styles.th}>Cliente</th>
            <th style={styles.th}>Total</th>
            <th style={styles.th}>Ação</th>
          </tr>
        </thead>
        <tbody>
          {pedidosPaginados.length > 0 ? (
            pedidosPaginados.map(p => (
              <LinhaPedido 
                key={p.id} 
                pedido={p} 
                dataFormatada={formatarDataExibicao(p.data)} 
                expandido={pedidoExpandido === p.id} 
                onExpandir={(id: string) => setPedidoExpandido(pedidoExpandido === id ? null : id)} 
                onDevolver={alternarDevolucao} 
              />
            ))
          ) : (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                Nenhum pedido encontrado com estes filtros.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Controles de Paginação */}
      {totalPaginas > 1 && (
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
          <button 
            disabled={paginaAtual === 1} 
            onClick={() => setPaginaAtual(prev => prev - 1)} 
            style={styles.btnAtalho}
          >
            Anterior
          </button>
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Pág {paginaAtual} de {totalPaginas}</span>
          <button 
            disabled={paginaAtual >= totalPaginas} 
            onClick={() => setPaginaAtual(prev => prev + 1)} 
            style={styles.btnAtalho}
          >
            Próxima
          </button>
        </div>
      )}
    </>
  );
};