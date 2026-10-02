// app/admin/_tabDashBoardMaster/TabSuporteMaster.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { 
  FiLayers, FiClock, FiCheckCircle, FiCalendar, 
  FiAlertCircle, FiSearch, FiFilter, FiPackage, FiUser, FiActivity 
} from "react-icons/fi";
import ModalSuporte from "@/app/admin/_components/ModalSuporte"; // 🌟 Importando o Modal compartilhado

export function TabSuporteMaster() {
  const { theme } = useTheme();
  
  // Estados para dados mensais, anuais e modal
  const [dadosMes, setDadosMes] = useState<any>({ tickets: [], metricas: {} });
  const [todosTicketsMes, setTodosTicketsMes] = useState<any[]>([]);
  const [dadosAno, setDadosAno] = useState<any>({ metricasAnuais: {} });
  const [ticketSelecionado, setTicketSelecionado] = useState<any | null>(null);
  
  // Filtros de visualização do Master
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroModulo, setFiltroModulo] = useState<string>("todos");
  const [buscaLoja, setBuscaLoja] = useState<string>("");

  // Datas e chaves de referência
  const dataAtual = new Date();
  const anoAtual = dataAtual.getFullYear();
  const mesesNomes = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];
  const chaveMesAtual = `${mesesNomes[dataAtual.getMonth()]}_${anoAtual}`;
  const anoStr = String(anoAtual);

  // ⏱️ Função auxiliar para formatar minutos em Dias, Horas e Minutos
  const formatarTempoEmDiasHorasMinutos = (minutosTotais: number) => {
    if (minutosTotais <= 0) return "Menos de 1 min";
    
    const dias = Math.floor(minutosTotais / (60 * 24));
    const horas = Math.floor((minutosTotais % (60 * 24)) / 60);
    const minutos = minutosTotais % 60;

    let partes = [];
    if (dias > 0) partes.push(`${dias}d`);
    if (horas > 0) partes.push(`${horas}h`);
    if (minutos > 0 || partes.length === 0) partes.push(`${minutos}m`);

    return partes.join(" ");
  };

  // 1. Escuta em tempo real o documento do MÊS atual
  useEffect(() => {
    const docMesRef = doc(db, "master_dashboard", "tickets_suporte", "meses", chaveMesAtual);
    const unsubMes = onSnapshot(docMesRef, (docSnap) => {
      if (docSnap.exists()) {
        const dados = docSnap.data();
        setDadosMes(dados);
        const lista = dados.tickets || [];
        lista.reverse(); // Mais recentes primeiro
        setTodosTicketsMes(lista);
      } else {
        setDadosMes({ tickets: [], metricas: {} });
        setTodosTicketsMes([]);
      }
    });

    return () => unsubMes();
  }, [chaveMesAtual]);

  // 2. Escuta em tempo real o documento do ANO atual (Métricas Anuais e Tempo Médio)
  useEffect(() => {
    const docAnoRef = doc(db, "master_dashboard", "tickets_suporte", "anos", anoStr);
    const unsubAno = onSnapshot(docAnoRef, (docSnap) => {
      if (docSnap.exists()) {
        setDadosAno(docSnap.data());
      } else {
        setDadosAno({ metricasAnuais: {} });
      }
    });

    return () => unsubAno();
  }, [anoStr]);

  // Extração das métricas
  const metricasMes = dadosMes.metricas || {
    totalGlobal: 0, totalAbertos: 0, totalFechados: 0, porTipoOcorrencia: {}
  };

  const metricasAnuais = dadosAno.metricasAnuais || {
    totalGlobal: 0, totalAbertos: 0, totalFechados: 0, porTipoOcorrencia: {}, tempoMedioResolucaoMinutos: 0
  };

  // Filtragem local
  const ticketsFiltrados = todosTicketsMes.filter(t => {
    const matchStatus = filtroStatus === "todos" 
      ? true 
      : filtroStatus === "aberto" 
        ? (t.dsStatus === "aberto" || t.dsStatus === "em_andamento")
        : (t.dsStatus === "resolvido" || t.dsStatus === "fechado");

    const matchModulo = filtroModulo === "todos" ? true : t.dsTipoOcorrencia === filtroModulo;
    
    const termo = buscaLoja.toLowerCase();
    const matchBusca = !termo || 
      String(t.nmLoja || "").toLowerCase().includes(termo) ||
      String(t.dsCodigoTicket || "").toLowerCase().includes(termo) ||
      String(t.dsDescricaoProblema || "").toLowerCase().includes(termo);

    return matchStatus && matchModulo && matchBusca;
  });

  return (
    <div style={{ ...styles.container, background: theme.bgApp, color: theme.textMain }}>
      <div style={styles.header}>
        <h1 style={styles.title}>Central de Controle Master - Suporte & Chamados</h1>
        <p style={{ color: theme.textSec, fontSize: "14px" }}>
          Monitoramento global de ocorrências da rede ({mesesNomes[dataAtual.getMonth()].toUpperCase()} / {anoAtual}).
        </p>
      </div>

      {/* 🚀 1. CARDS DE MÉTRICAS GLOBAIS DO MÊS */}
      <div style={styles.gridCardsResumo}>
        <div style={{ ...styles.cardResumo, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <div style={{ ...styles.iconResumoBox, background: "#e0f2fe", color: "#0284c7" }}>
            <FiLayers size={22} />
          </div>
          <div>
            <span style={{ color: theme.textSec, fontSize: "12px", fontWeight: "600" }}>Total Global (Mês)</span>
            <h2 style={{ fontSize: "22px", fontWeight: "800", marginTop: "2px" }}>{metricasMes.totalGlobal}</h2>
          </div>
        </div>

        <div style={{ ...styles.cardResumo, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <div style={{ ...styles.iconResumoBox, background: "#fef3c7", color: "#d97706" }}>
            <FiClock size={22} />
          </div>
          <div>
            <span style={{ color: theme.textSec, fontSize: "12px", fontWeight: "600" }}>Abertos / Em Atendimento</span>
            <h2 style={{ fontSize: "22px", fontWeight: "800", marginTop: "2px", color: "#d97706" }}>{metricasMes.totalAbertos}</h2>
          </div>
        </div>

        <div style={{ ...styles.cardResumo, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
          <div style={{ ...styles.iconResumoBox, background: "#dcfce7", color: "#16a34a" }}>
            <FiCheckCircle size={22} />
          </div>
          <div>
            <span style={{ color: theme.textSec, fontSize: "12px", fontWeight: "600" }}>Resolvidos / Fechados</span>
            <h2 style={{ fontSize: "22px", fontWeight: "800", marginTop: "2px", color: "#16a34a" }}>{metricasMes.totalFechados}</h2>
          </div>
        </div>
      </div>

      {/* 🌟 2. CARDS DE MÉTRICAS ANUAIS E TEMPO MÉDIO */}
      <div style={{ ...styles.sectionBox, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <h3 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
          <FiCalendar size={16} color={theme.primary} /> Consolidação Anual ({anoAtual}) & Performance da Equipe
        </h3>

        <div style={styles.gridCardsResumo}>
          <div style={{ ...styles.cardResumo, background: theme.inputBg, border: `1px solid ${theme.border}` }}>
            <div style={{ ...styles.iconResumoBox, background: "#f3e8ff", color: "#9333ea" }}>
              <FiActivity size={22} />
            </div>
            <div>
              <span style={{ color: theme.textSec, fontSize: "12px", fontWeight: "600" }}>Total Acumulado no Ano</span>
              <h2 style={{ fontSize: "20px", fontWeight: "800", marginTop: "2px" }}>{metricasAnuais.totalGlobal || 0} tickets</h2>
            </div>
          </div>

          <div style={{ ...styles.cardResumo, background: theme.inputBg, border: `1px solid ${theme.border}` }}>
            <div style={{ ...styles.iconResumoBox, background: "#e0e7ff", color: "#4f46e5" }}>
              <FiClock size={22} />
            </div>
            <div>
              <span style={{ color: theme.textSec, fontSize: "12px", fontWeight: "600" }}>Tempo Médio de Resolução</span>
              <h2 style={{ fontSize: "20px", fontWeight: "800", marginTop: "2px" }}>
                {formatarTempoEmDiasHorasMinutos(metricasAnuais.tempoMedioResolucaoMinutos || 0)}
              </h2>
            </div>
          </div>
        </div>

        {/* Motivos mais recorrentes do ano */}
        <div style={{ marginTop: "15px" }}>
          <span style={{ fontSize: "12px", fontWeight: "700", color: theme.textSec, textTransform: "uppercase" }}>
            Módulos Mais Recorrentes no Ano:
          </span>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "8px" }}>
            {Object.keys(metricasAnuais.porTipoOcorrencia || {}).length === 0 ? (
              <span style={{ fontSize: "13px", color: theme.textSec }}>Sem dados anuais suficientes.</span>
            ) : (
              Object.entries(metricasAnuais.porTipoOcorrencia).map(([mod, qtd]: [string, any]) => (
                <span key={mod} style={{ fontSize: "12px", background: theme.inputBg, border: `1px solid ${theme.border}`, padding: "6px 12px", borderRadius: "8px", fontWeight: "600" }}>
                  <strong>{mod}:</strong> {qtd}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 📊 PAINEL DE MOTIVOS / MÓDULOS (MÊS) */}
      <div style={{ ...styles.sectionBox, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <h3 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
          <FiFilter size={16} color={theme.primary} /> Ocorrências Recorrentes por Módulo (Este Mês)
        </h3>
        
        <div style={styles.gridMotivos}>
          {Object.keys(metricasMes.porTipoOcorrencia || {}).length === 0 ? (
            <span style={{ fontSize: "13px", color: theme.textSec }}>Nenhum chamado registrado neste mês ainda.</span>
          ) : (
            Object.entries(metricasMes.porTipoOcorrencia).map(([modulo, qtd]: [string, any]) => (
              <div key={modulo} style={{ ...styles.motivoCard, background: theme.inputBg, border: `1px solid ${theme.border}` }}>
                <span style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", color: theme.textSec }}>
                  {modulo}
                </span>
                <span style={{ fontSize: "18px", fontWeight: "800", color: theme.primary, marginTop: "4px" }}>
                  {qtd} <span style={{ fontSize: "11px", fontWeight: "normal", color: theme.textSec }}>tickets</span>
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 🔍 BARRA DE FILTROS E BUSCA */}
      <div style={{ ...styles.filterBar, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <div style={{ display: "flex", alignItems: "center", background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: "10px", padding: "10px 14px", gap: "10px", flex: 1, minWidth: "260px" }}>
          <FiSearch size={16} color={theme.textSec} />
          <input 
            type="text" 
            placeholder="Buscar por nome da loja, código do ticket ou relato..." 
            value={buscaLoja}
            onChange={e => setBuscaLoja(e.target.value)}
            style={{ background: "transparent", border: "none", outline: "none", color: theme.textMain, width: "100%", fontSize: "13px" }}
          />
        </div>

        <select 
          value={filtroStatus} 
          onChange={e => setFiltroStatus(e.target.value)}
          style={{ ...styles.selectFilter, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}` }}
        >
          <option value="todos">Status: Todos</option>
          <option value="aberto">⚡ Abertos / Em Atendimento</option>
          <option value="resolvido">✅ Resolvidos / Fechados</option>
        </select>

        <select 
          value={filtroModulo} 
          onChange={e => setFiltroModulo(e.target.value)}
          style={{ ...styles.selectFilter, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}` }}
        >
          <option value="todos">Módulo: Todos</option>
          <option value="dashboard">Dashboard</option>
          <option value="produtos">Produtos</option>
          <option value="pedidos">Pedidos</option>
          <option value="pdv">PDV (Caixa)</option>
          <option value="devolucoes">Devoluções</option>
          <option value="financeiro">Financeiro</option>
          <option value="colaboradores">Colaboradores</option>
          <option value="estoque">Estoque</option>
          <option value="relatorios">Relatórios</option>
          <option value="suporte">Suporte</option>
          <option value="configuracoes">Configurações</option>
          <option value="assinatura">Assinatura</option>
        </select>
      </div>

      {/* 📋 LISTAGEM DE TICKETS DO MASTER */}
      <div style={{ ...styles.sectionBox, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "15px" }}>
          Chamados da Rede ({ticketsFiltrados.length}) - Clique para Atender
        </h3>

        {ticketsFiltrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: theme.textSec, fontSize: "14px" }}>
            Nenhum ticket encontrado com os filtros selecionados.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {ticketsFiltrados.map((ticket, index) => {
              const isAberto = ticket.dsStatus === "aberto" || ticket.dsStatus === "em_andamento";
              
              // ⏱️ Cálculo do tempo decorrido ou tempo total de atendimento em minutos
              const tempoInicio = new Date(ticket.tsCriacao).getTime();
              const tempoFim = (!isAberto && ticket.tsFechamento) 
                ? new Date(ticket.tsFechamento).getTime() 
                : new Date().getTime();
              
              const diffMinutos = Math.max(0, Math.round((tempoFim - tempoInicio) / (1000 * 60)));
              const tempoFormatado = formatarTempoEmDiasHorasMinutos(diffMinutos);

              return (
                <div 
                  key={index} 
                  onClick={() => setTicketSelecionado(ticket)} // 🌟 Abre o Modal ao clicar no ticket
                  style={{ ...styles.ticketCard, background: theme.inputBg, border: `1px solid ${theme.border}`, cursor: "pointer", transition: "0.2s" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <span style={{ fontSize: "14px", fontWeight: "800", color: theme.primary, marginRight: "10px" }}>
                        {ticket.dsCodigoTicket}
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: theme.textMain, background: theme.bgCard, padding: "3px 8px", borderRadius: "6px", marginRight: "8px" }}>
                        🏪 {ticket.nmLoja || "Loja"}
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", color: theme.textSec }}>
                        [{ticket.dsTipoOcorrencia}]
                      </span>
                    </div>
                    
                    <span style={{ 
                      padding: "4px 10px", 
                      borderRadius: "20px", 
                      fontSize: "11px", 
                      fontWeight: "700",
                      backgroundColor: isAberto ? "#fef3c7" : "#dcfce7",
                      color: isAberto ? "#d97706" : "#16a34a"
                    }}>
                      {isAberto ? "⚡ ABERTO / EM ATENDIMENTO" : "✅ RESOLVIDO"}
                    </span>
                  </div>

                  <p style={{ fontSize: "13px", color: theme.textMain, marginBottom: "10px", lineHeight: "1.4" }}>
                    {ticket.dsDescricaoProblema}
                  </p>

                  {ticket.pedidoVinculado && (
                    <div style={{ fontSize: "12px", color: theme.textSec, marginBottom: "8px", background: theme.bgCard, padding: "6px 10px", borderRadius: "6px", display: "inline-block" }}>
                      📦 Pedido Vinculado: <strong>#{ticket.pedidoVinculado.nrNumeroPedido}</strong> - Cliente: {ticket.pedidoVinculado.nmCliente} (R$ {ticket.pedidoVinculado.vlTotal?.toFixed(2)})
                    </div>
                  )}

                  {/* ⏱️ Rodapé do Card com Data e Tempo Formatado */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: theme.textSec, borderTop: `1px solid ${theme.border}`, paddingTop: "8px", marginTop: "4px", flexWrap: "wrap", gap: "6px" }}>
                    <span>Aberto em: {new Date(ticket.dtCriacaoString || ticket.tsCriacao).toLocaleString("pt-BR")}</span>
                    <span style={{ fontWeight: "700", color: isAberto ? "#d97706" : "#16a34a", display: "flex", alignItems: "center", gap: "4px" }}>
                      <FiClock size={13} /> 
                      {isAberto ? `Tempo em aberto: ${tempoFormatado}` : `Tempo total de atendimento: ${tempoFormatado}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🌟 RENDERIZAÇÃO DO MODAL DE SUPORTE NO PAINEL MASTER */}
      {ticketSelecionado && (
        <ModalSuporte 
          ticket={ticketSelecionado}
          chaveMes={chaveMesAtual}
          onClose={() => setTicketSelecionado(null)}
          theme={theme}
          isMaster={true}
        />
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: "30px", minHeight: "100vh" },
  header: { marginBottom: "25px" },
  title: { fontSize: "24px", fontWeight: "800", marginBottom: "5px" },
  gridCardsResumo: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "15px", marginBottom: "25px" },
  cardResumo: { padding: "20px", borderRadius: "14px", display: "flex", alignItems: "center", gap: "15px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)" },
  iconResumoBox: { width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sectionBox: { padding: "24px", borderRadius: "16px", marginBottom: "25px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)" },
  gridMotivos: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" },
  motivoCard: { padding: "14px", borderRadius: "12px", display: "flex", flexDirection: "column" },
  filterBar: { display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "25px", padding: "16px", borderRadius: "14px", alignItems: "center" },
  selectFilter: { padding: "10px 14px", borderRadius: "10px", fontSize: "13px", outline: "none", cursor: "pointer" },
  ticketCard: { padding: "16px", borderRadius: "12px", cursor: "pointer" }
};