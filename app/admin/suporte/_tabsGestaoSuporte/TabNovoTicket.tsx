// app/admin/suporte/_tabsGestaoSuporte/TabNovoTicket.tsx
"use client";
import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { FiCpu, FiSearch, FiSend, FiCheckCircle } from "react-icons/fi";

export function TabNovoTicket({ uid, nomeLoja, onSucesso, theme }: { uid: string | null, nomeLoja: string, onSucesso: () => void, theme: any }) {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [buscaPedido, setBuscaPedido] = useState("");
  const [pedidoSelecionado, setPedidoSelecionado] = useState<any | null>(null);
  const [tipoOcorrencia, setTipoOcorrencia] = useState("dashboard");
  const [descricaoProblema, setDescricaoProblema] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucessoEnvio, setSucessoEnvio] = useState(false);
  const [codigoTicketGerado, setCodigoTicketGerado] = useState("");
  const [telefoneLoja, setTelefoneLoja] = useState(""); // 🌟 Estado para armazenar o telefone da loja

  useEffect(() => {
    if (!uid) return;
    
    // 1. Busca os pedidos da loja
    const q = query(collection(db, "lojistas", uid, "pedidos"));
    const unsub = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPedidos(lista);
    });

    // 🌟 2. Busca o telefone cadastrado no perfil da loja
    async function carregarTelefoneLoja() {
      if (!uid) return; // 🌟 Validação para garantir que o uid é string e evitar erro de tipagem
      try {
        const lojistaDoc = await getDoc(doc(db, "lojistas", uid));
        if (lojistaDoc.exists()) {
          const dados = lojistaDoc.data();
          const fone = dados.dadosLoja?.nrWhatssapLoja || dados.nrWhatssapLoja || "";
          setTelefoneLoja(fone);
        }
      } catch (err) {
        console.error("Erro ao buscar telefone da loja:", err);
      }
    }
    carregarTelefoneLoja();

    return () => unsub();
  }, [uid]);

  const pedidosFiltrados = pedidos.filter(p => {
    const num = String(p.nrNumeroPedido || p.numeroPedido || p.id).toLowerCase();
    const cliente = String(p.dsCliente?.nmNomeCliente || p.cliente?.nome || "").toLowerCase();
    const termo = buscaPedido.toLowerCase();
    return num.includes(termo) || cliente.includes(termo);
  }).slice(0, 5);

  const handleEnviarChamadoMaster = async () => {
    if (!descricaoProblema.trim()) {
      alert("Por favor, descreva o problema detalhadamente antes de enviar o chamado.");
      return;
    }

    setEnviando(true);
    try {
      const functions = getFunctions(db.app, "southamerica-east1");
      const criarTicketFn = httpsCallable(functions, "criarTicketSuporte");

      const payload = {
        tipoOcorrencia,
        descricaoProblema,
        telefoneLoja, // 🌟 Passa o telefone da loja capturado para o backend gravar no ticket
        pedidoVinculado: pedidoSelecionado ? {
          idPedidoBanco: pedidoSelecionado.id,
          nrNumeroPedido: pedidoSelecionado.nrNumeroPedido || pedidoSelecionado.id.slice(0,6),
          nmCliente: pedidoSelecionado.dsCliente?.nmNomeCliente || pedidoSelecionado.cliente?.nome || "Consumidor",
          vlTotal: pedidoSelecionado.financeiro?.vlTotal || pedidoSelecionado.total || 0
        } : null
      };

      const resultado: any = await criarTicketFn(payload);

      if (resultado.data && resultado.data.sucesso) {
        setCodigoTicketGerado(resultado.data.codigoTicket);
        setSucessoEnvio(true);
        setDescricaoProblema("");
        setPedidoSelecionado(null);
        setBuscaPedido("");

        setTimeout(() => {
          setSucessoEnvio(false);
          onSucesso();
        }, 2000);
      }
    } catch (error: any) {
      console.error("Erro ao invocar função de suporte:", error);
      alert("Erro ao registrar chamado: " + (error.message || error));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      {sucessoEnvio && (
        <div style={{ ...styles.alertSucesso, background: "#dcfce7", color: "#16a34a", border: "1px solid #bbf7d0" }}>
          <FiCheckCircle size={18} /> Chamado <strong>{codigoTicketGerado}</strong> enviado com sucesso para a Central Master!
        </div>
      )}

      <div style={{ ...styles.erpBox, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
        <div style={styles.erpHeaderTitle}>
          <FiCpu size={20} color={theme.primary} />
          <h3 style={{ fontSize: "16px", fontWeight: "700" }}>Abrir Ticket de Suporte Direto (Master)</h3>
        </div>
        <p style={{ color: theme.textSec, fontSize: "13px", marginBottom: "15px" }}>
          Loja Identificada: <strong style={{ color: theme.primary }}>{nomeLoja}</strong> (ID: {uid || "..."})
        </p>

        <div style={styles.erpGridForm}>
          <div style={{ position: "relative", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: "10px", padding: "10px 14px", gap: "10px" }}>
              <FiSearch size={16} color={theme.textSec} />
              <input 
                type="text" 
                placeholder="Vincular pedido (Opcional: nº ou nome do cliente)..." 
                value={buscaPedido}
                onChange={e => setBuscaPedido(e.target.value)}
                style={{ background: "transparent", border: "none", outline: "none", color: theme.textMain, width: "100%", fontSize: "13px" }}
              />
            </div>

            {buscaPedido && pedidosFiltrados.length > 0 && (
              <div style={{ ...styles.dropdownPedidos, background: theme.bgCard, border: `1px solid ${theme.border}` }}>
                {pedidosFiltrados.map(p => {
                  const num = p.nrNumeroPedido || p.id.slice(0,6);
                  const nome = p.dsCliente?.nmNomeCliente || p.cliente?.nome || "Cliente";
                  return (
                    <div 
                      key={p.id} 
                      onClick={() => { setPedidoSelecionado(p); setBuscaPedido(""); }}
                      style={{ ...styles.dropdownItem, borderBottom: `1px solid ${theme.border}` }}
                    >
                      <span style={{ fontWeight: "700", color: theme.primary }}>#{num}</span> - <span>{nome}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seletor com as Opções Exatas do Menu ERP */}
          <select 
            value={tipoOcorrencia} 
            onChange={e => setTipoOcorrencia(e.target.value)}
            style={{ ...styles.selectInput, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}` }}
          >
            <option value="dashboard">📊 Dashboard</option>
            <option value="produtos">📦 Produtos</option>
            <option value="pedidos">🛒 Pedidos</option>
            <option value="pdv">💻 PDV (Caixa)</option>
            <option value="devolucoes">🔄 Devoluções</option>
            <option value="financeiro">💰 Financeiro</option>
            <option value="colaboradores">👥 Colaboradores</option>
            <option value="estoque">🏢 Estoque</option>
            <option value="relatorios">📈 Relatórios</option>
            <option value="suporte">🛠️ Suporte</option>
            <option value="configuracoes">⚙️ Configurações</option>
            <option value="assinatura">⭐ Assinatura</option>
          </select>
        </div>

        {pedidoSelecionado && (
          <div style={{ ...styles.pedidoSelecionadoCard, background: theme.inputBg, border: `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", fontWeight: "700" }}>
                Pedido Vinculado: #{pedidoSelecionado.nrNumeroPedido || pedidoSelecionado.id.slice(0,6)} ({pedidoSelecionado.dsCliente?.nmNomeCliente || pedidoSelecionado.cliente?.nome})
              </span>
              <button onClick={() => setPedidoSelecionado(null)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>
                Remover Vínculo ✕
              </button>
            </div>
          </div>
        )}

        <textarea 
          placeholder="Descreva detalhadamente o ocorrido ou solicitação relacionada ao módulo escolhido..."
          value={descricaoProblema}
          onChange={e => setDescricaoProblema(e.target.value)}
          rows={4}
          style={{ ...styles.textarea, background: theme.inputBg, color: theme.textMain, border: `1px solid ${theme.border}` }}
        />

        <button 
          onClick={handleEnviarChamadoMaster}
          disabled={enviando}
          style={{ ...styles.btnPrimaryERP, background: theme.primary, opacity: enviando ? 0.7 : 1 }}
        >
          <FiSend size={16} /> {enviando ? "Transmitindo Chamado..." : "Enviar Chamado Oficial para a Central Master"}
        </button>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  erpBox: { padding: "24px", borderRadius: "16px", marginBottom: "30px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" },
  erpHeaderTitle: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" },
  alertSucesso: { padding: "12px 16px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontWeight: "600", marginBottom: "20px" },
  erpGridForm: { display: "flex", gap: "15px", flexWrap: "wrap", marginBottom: "15px" },
  dropdownPedidos: { position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, borderRadius: "10px", marginTop: "5px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", maxHeight: "200px", overflowY: "auto" },
  dropdownItem: { padding: "10px 14px", fontSize: "13px", cursor: "pointer" },
  selectInput: { padding: "10px 14px", borderRadius: "10px", fontSize: "13px", outline: "none", cursor: "pointer", minWidth: "220px" },
  pedidoSelecionadoCard: { padding: "10px 14px", borderRadius: "8px", marginBottom: "15px" },
  textarea: { width: "100%", padding: "12px 14px", borderRadius: "10px", outline: "none", fontSize: "13px", resize: "vertical", marginBottom: "15px", boxSizing: "border-box" },
  btnPrimaryERP: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "14px 20px", borderRadius: "10px", color: "#fff", border: "none", fontWeight: "700", fontSize: "14px", cursor: "pointer", width: "100%" }
};