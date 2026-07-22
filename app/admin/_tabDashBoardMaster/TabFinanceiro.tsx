"use client";
import React, { useState, useMemo } from "react";

export default function TabFinanceiro({ lojistas }: { lojistas: any[] }) {
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
    <div style={styles.container}>
      <h2 style={styles.titulo}>Painel Financeiro de Lojistas</h2>
      
      {/* Campo de Pesquisa */}
      <input 
        style={styles.inputBusca}
        placeholder="🔍 Pesquisar por nome da loja, dono ou CPF..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <table style={styles.table}>
        <thead>
          <tr style={styles.thRow}>
            <th style={styles.th}>NOME DA LOJA</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>LUCRO LÍQUIDO REAL</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>TICKET MÉDIO</th>
          </tr>
        </thead>
        <tbody>
          {lojistasFiltrados.map((loja) => (
            <React.Fragment key={loja.id}>
              <tr 
                style={styles.tr} 
                onClick={() => setExpandido(expandido === loja.id ? null : loja.id)}
              >
                <td style={styles.tdLoja}>
                  <span style={styles.seta}>{expandido === loja.id ? '🔼' : '🔽'}</span>
                  {loja.nomeLoja || "Loja sem nome"}
                </td>
                <td style={styles.tdFinanceiro}>{formatarMoeda(loja.lucroReal || 0)}</td>
                <td style={styles.tdFinanceiro}>{formatarMoeda(loja.ticketMedio || 0)}</td>
              </tr>

              {expandido === loja.id && (
                <tr style={styles.trExpandido}>
                  <td colSpan={3} style={styles.tdExpandido}>
                    <div style={styles.boxGrid}>
                      {/* DADOS PESSOAIS */}
                      <div>
                        <h4 style={styles.boxTitle}>DADOS PESSOAIS</h4>
                        <p style={styles.boxItem}><strong>Dono:</strong> {loja.nomeResponsavel || "---"}</p>
                        <p style={styles.boxItem}><strong>CPF:</strong> {loja.cpfResponsavel || "---"}</p>
                        <p style={styles.boxItem}><strong>E-mail:</strong> {loja.emailPessoal || "---"}</p>
                        <p style={styles.boxItem}><strong>WhatsApp:</strong> {loja.whatsapp || "---"}</p>
                      </div>
                      
                      {/* DADOS DA LOJA */}
                      <div>
                        <h4 style={styles.boxTitle}>DADOS DA LOJA</h4>
                        <p style={styles.boxItem}><strong>Plano:</strong> {loja.plano || "Bronze"}</p>
                        <p style={styles.boxItem}><strong>Endereço:</strong> {loja.ruaOrigem || "---"}, {loja.numeroOrigem || "---"}</p>
                        <p style={styles.boxItem}><strong>Bairro:</strong> {loja.bairroOrigem || "---"}</p>
                        <p style={styles.boxItem}><strong>CEP/Cidade:</strong> {loja.cepOrigem || "---"} - {loja.cidadeOrigem || "---"}/{loja.ufOrigem || "--"}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { background: "#fff", padding: "20px", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" },
  titulo: { fontSize: "18px", marginBottom: "20px", color: "#1e293b" },
  inputBusca: { width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "14px" },
  table: { width: "100%", borderCollapse: "collapse" },
  thRow: { borderBottom: "2px solid #f1f5f9" },
  th: { padding: "12px", textAlign: "left", fontSize: "11px", color: "#64748b", textTransform: "uppercase" },
  tr: { cursor: "pointer", borderBottom: "1px solid #f1f5f9", transition: "0.2s" },
  tdLoja: { padding: "16px", fontWeight: "700", color: "#334155" },
  tdFinanceiro: { padding: "16px", textAlign: "right", fontWeight: "600", color: "#0f172a" },
  seta: { marginRight: "10px", fontSize: "10px" },
  trExpandido: { background: "#f8fafc" },
  tdExpandido: { padding: "20px" },
  boxGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" },
  boxTitle: { fontSize: "10px", fontWeight: "800", color: "#94a3b8", marginBottom: "8px", textTransform: "uppercase" },
  boxItem: { fontSize: "13px", color: "#475569", margin: "4px 0" }
};