// app/admin/suporte/_tabsGestaoSuporte/TabMeusTicket.tsx
"use client";
import React, { useState } from "react";
import { FiList } from "react-icons/fi";
import ModalSuporte from "@/app/admin/_components/ModalSuporte"; // 🌟 Importando o Modal unificado

export function TabMeusTicket({ meusTickets, theme }: { meusTickets: any[], theme: any }) {
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [ticketSelecionado, setTicketSelecionado] = useState<any | null>(null); // Estado para abrir o modal
  const itensPorPagina = 5;

  const totalPaginas = Math.ceil(meusTickets.length / itensPorPagina) || 1;
  const ticketsPaginados = meusTickets.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  // Descobre a chave do mês atual (ex: "setembro_2026") para passar ao modal
  const dataAtual = new Date();
  const mesesNomes = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];
  const chaveMesAtual = `${mesesNomes[dataAtual.getMonth()]}_${dataAtual.getFullYear()}`;

  return (
    <div style={{ ...styles.erpBox, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
      <div style={styles.erpHeaderTitle}>
        <FiList size={20} color={theme.primary} />
        <h3 style={{ fontSize: "16px", fontWeight: "700" }}>Histórico de Chamados Abertos</h3>
      </div>
      <p style={{ color: theme.textSec, fontSize: "13px", marginBottom: "20px" }}>
        Acompanhe o status das solicitações enviadas por sua loja ao suporte Master. Clique em um ticket para ver os detalhes e interagir.
      </p>

      {ticketsPaginados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: theme.textSec, fontSize: "14px" }}>
          Nenhum ticket encontrado para o mês atual.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {ticketsPaginados.map((ticket, index) => {
            const isAberto = ticket.dsStatus === "aberto" || ticket.dsStatus === "em_andamento";
            return (
              <div 
                key={index} 
                onClick={() => setTicketSelecionado(ticket)} // 🌟 Abre o modal ao clicar no card
                style={{ ...styles.ticketCard, background: theme.inputBg, border: `1px solid ${theme.border}`, cursor: "pointer", transition: "0.2s" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <span style={{ fontSize: "14px", fontWeight: "800", color: theme.primary, marginRight: "10px" }}>
                      {ticket.dsCodigoTicket}
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", color: theme.textSec }}>
                      [{ticket.dsTipoOcorrencia?.replace("_", " ")}]
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
                    {isAberto ? "⚡ EM ATENDIMENTO / ABERTO" : "✅ RESOLVIDO / FECHADO"}
                  </span>
                </div>

                <p style={{ fontSize: "13px", color: theme.textMain, marginBottom: "10px", lineHeight: "1.4" }}>
                  {ticket.dsDescricaoProblema}
                </p>

                {ticket.pedidoVinculado && (
                  <div style={{ fontSize: "12px", color: theme.textSec, marginBottom: "8px", background: theme.bgCard, padding: "6px 10px", borderRadius: "6px", display: "inline-block" }}>
                    📦 Pedido Vinculado: <strong>#{ticket.pedidoVinculado.nrNumeroPedido}</strong> - Cliente: {ticket.pedidoVinculado.nmCliente}
                  </div>
                )}

                <div style={{ fontSize: "11px", color: theme.textSec, textAlign: "right" }}>
                  Criado em: {new Date(ticket.dtCriacaoString || ticket.tsCriacao).toLocaleString("pt-BR")}
                </div>
              </div>
            );
          })}

          {totalPaginas > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginTop: "20px" }}>
              <button 
                disabled={paginaAtual === 1}
                onClick={(e) => { e.stopPropagation(); setPaginaAtual(prev => prev - 1); }}
                style={{ ...styles.btnPaginacao, opacity: paginaAtual === 1 ? 0.5 : 1, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}` }}
              >
                Anterior
              </button>
              <span style={{ fontSize: "13px", fontWeight: "700" }}>Página {paginaAtual} de {totalPaginas}</span>
              <button 
                disabled={paginaAtual >= totalPaginas}
                onClick={(e) => { e.stopPropagation(); setPaginaAtual(prev => prev + 1); }}
                style={{ ...styles.btnPaginacao, opacity: paginaAtual >= totalPaginas ? 0.5 : 1, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}` }}
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      )}

      {/* 🌟 RENDERIZAÇÃO CONDICIONAL DO MODAL DE SUPORTE */}
      {ticketSelecionado && (
        <ModalSuporte 
          ticket={ticketSelecionado}
          chaveMes={chaveMesAtual}
          onClose={() => setTicketSelecionado(null)}
          theme={theme}
          isMaster={false}
        />
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  erpBox: { padding: "24px", borderRadius: "16px", marginBottom: "30px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" },
  erpHeaderTitle: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" },
  ticketCard: { padding: "16px", borderRadius: "12px" },
  btnPaginacao: { padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }
};