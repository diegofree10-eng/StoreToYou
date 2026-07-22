"use client";

import React, { useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { processarCsvMarketplace } from "@/utils/marketplaceParser";

interface CanalRenda {
  canal: string;
  valorLiquidoRecebido: number;
  mesAno: string;
}

interface TabFaturamentoCanaisProps {
  canaisExternos: CanalRenda[];
  faturamentoCatalogoProprio: number;
  formatarMoeda: (v: number) => string;
}

export function TabFaturamentoCanais({ canaisExternos, faturamentoCatalogoProprio, formatarMoeda }: TabFaturamentoCanaisProps) {
  const [carregando, setCarregando] = useState(false);
  const [status, setStatus] = useState<{ tipo: "sucesso" | "erro", msg: string } | null>(null);

  // 🧮 Agrupa os faturamentos consolidados por canal para renderizar no gráfico macro
  const totais = canaisExternos.reduce((acc, curr) => {
    acc[curr.canal] = (acc[curr.canal] || 0) + curr.valorLiquidoRecebido;
    return acc;
  }, {} as Record<string, number>);

  const totalGeralOmnichannel = faturamentoCatalogoProprio + Object.values(totais).reduce((a, b) => a + b, 0);

  const obterPorcentagem = (valor: number) => {
    if (totalGeralOmnichannel === 0) return "0%";
    return `${((valor / totalGeralOmnichannel) * 100).toFixed(1)}%`;
  };

  // 📥 Função que faz o Upload e o Parser automático do arquivo .CSV
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCarregando(true);
    setStatus(null);

    try {
      const uId = auth.currentUser?.uid;
      if (!uId) throw new Error("Usuário administrativo não autenticado.");

      // Executa o leitor inteligente que criamos na pasta utils
      const dadosConsolidados = await processarCsvMarketplace(file);

      // Define o ID amigável do documento para o mês/ano correspondente
      const docId = `${dadosConsolidados.canal}_${dadosConsolidados.mesAno.replace("/", "_")}`;
      
      // 🎯 CORREÇÃO CIRÚRGICA: Caminho hierárquico do Firestore padronizado e blindado contra quebras
      const faturamentoDocRef = doc(db, "lojistas", uId, "faturamento_canais", docId);

      await setDoc(faturamentoDocRef, {
        canal: dadosConsolidados.canal,
        mesAno: dadosConsolidados.mesAno,
        valorLiquidoRecebido: dadosConsolidados.valorLiquidoRecebido,
        atualizadoEm: new Date().toISOString()
      }, { merge: true });

      setStatus({
        tipo: "sucesso",
        msg: `🚀 Sucesso! Arquivo da ${dadosConsolidados.canal.toUpperCase()} (${dadosConsolidados.mesAno}) importado. Total líquido computado: + ${formatarMoeda(dadosConsolidados.valorLiquidoRecebido)}`
      });

    } catch (error: any) {
      console.error(error);
      setStatus({ 
        tipo: "erro", 
        msg: typeof error === "string" ? error : "Erro ao ler o cabeçalho do arquivo CSV. Verifique o formato." 
      });
    } finally {
      setCarregando(false);
      // Reseta o input de arquivo para permitir reenviar o mesmo arquivo se necessário
      e.target.value = "";
    }
  };

  return (
    <div style={{ padding: "10px 0" }}>
      
      {/* --- SEÇÃO 1: CENTRAL DE UPLOAD INTELIGENTE (DROPZONE) --- */}
      <div style={localStyles.importBox}>
        <h4 style={{ margin: "0 0 5px 0", color: "#334155" }}>📥 Central de Importação de Extratos Financeiros</h4>
        <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 15px 0", lineHeight: "1.5" }}>
          Suba os arquivos <strong>.CSV</strong> brutos gerados pela <strong>Shopee, Mercado Livre ou TikTok Shop</strong>. 
          O robô inteligente identificará a origem pelas colunas, filtrará taxas, fretes e comissões da plataforma, computando apenas o saldo líquido real que entrou no seu caixa.
        </p>

        <label style={carregando ? localStyles.uploadBtnDisabled : localStyles.uploadBtn}>
          {carregando ? "🔄 Processando Inteligência Omnichannel..." : "📂 Selecionar Relatório de Vendas (.CSV)"}
          <input type="file" accept=".csv" onChange={handleCsvUpload} disabled={carregando} style={{ display: "none" }} />
        </label>

        {status && (
          <div style={status.tipo === "sucesso" ? localStyles.msgSucesso : localStyles.msgErro}>
            {status.msg}
          </div>
        )}
      </div>

      <hr style={{ border: "0", borderTop: "1px solid #e2e8f0", margin: "30px 0" }} />

      {/* --- SEÇÃO 2: GRÁFICO E DISTRIBUIÇÃO ANALÍTICA --- */}
      <h4 style={{ margin: "0 0 15px 0", color: "#334155" }}>📊 Composição de Renda Consolidada (Geral)</h4>
      
      <div style={localStyles.barraDistribuidora}>
        <div style={{ ...localStyles.segmento, background: "#3498db", width: obterPorcentagem(faturamentoCatalogoProprio) }} title="Catálogo Próprio" />
        <div style={{ ...localStyles.segmento, background: "#fe5722", width: obterPorcentagem(totais["shopee"] || 0) }} title="Shopee" />
        <div style={{ ...localStyles.segmento, background: "#ffdb15", width: obterPorcentagem(totais["mercado_livre"] || 0) }} title="Mercado Livre" />
        <div style={{ ...localStyles.segmento, background: "#000000", width: obterPorcentagem(totais["tiktok"] || 0) }} title="TikTok Shop" />
      </div>

      <div style={{ marginTop: "25px", background: "#fff", border: "1px solid #f1f5f9", borderRadius: "8px" }}>
        <div style={localStyles.linhaCanal}>
          <span>🌐 Catálogo Interno do Sistema (Vendas Diretas):</span>
          <strong>{formatarMoeda(faturamentoCatalogoProprio)} <span style={localStyles.porcentagemLabel}>({obterPorcentagem(faturamentoCatalogoProprio)})</span></strong>
        </div>

        <div style={localStyles.linhaCanal}>
          <span>🧡 Faturamento Líquido Shopee:</span>
          <strong style={{ color: "#fe5722" }}>{formatarMoeda(totais["shopee"] || 0)} <span style={localStyles.porcentagemLabel}>({obterPorcentagem(totais["shopee"] || 0)})</span></strong>
        </div>

        <div style={localStyles.linhaCanal}>
          <span>💛 Faturamento Líquido Mercado Livre:</span>
          <strong style={{ color: "#d4af37" }}>{formatarMoeda(totais["mercado_livre"] || 0)} <span style={localStyles.porcentagemLabel}>({obterPorcentagem(totais["mercado_livre"] || 0)})</span></strong>
        </div>

        <div style={localStyles.linhaCanal}>
          <span>🖤 Faturamento Líquido TikTok Shop:</span>
          <strong style={{ color: "#000" }}>{formatarMoeda(totais["tiktok"] || 0)} <span style={localStyles.porcentagemLabel}>({obterPorcentagem(totais["tiktok"] || 0)})</span></strong>
        </div>

        <div style={{ ...localStyles.linhaCanal, borderBottom: "none", background: "#f8fafc", fontWeight: "bold", borderRadius: "0 0 8px 8px" }}>
          <span style={{ color: "#1e293b" }}>💰 RECEITA OMNICHANNEL TOTAL LÍQUIDA:</span>
          <span style={{ color: "#1e293b", fontSize: "16px" }}>{formatarMoeda(totalGeralOmnichannel)}</span>
        </div>
      </div>
    </div>
  );
}

const localStyles: Record<string, React.CSSProperties> = {
  importBox: { padding: "20px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" },
  uploadBtn: { background: "#4f46e5", color: "#fff", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", display: "inline-block", fontWeight: "bold", fontSize: "13px", transition: "0.2s" },
  uploadBtnDisabled: { background: "#94a3b8", color: "#fff", padding: "10px 18px", borderRadius: "8px", display: "inline-block", cursor: "not-allowed" },
  msgSucesso: { marginTop: "15px", color: "#166534", background: "#dcfce7", padding: "12px 15px", borderRadius: "8px", fontSize: "13px", fontWeight: "bold" },
  msgErro: { marginTop: "15px", color: "#991b1b", background: "#fee2e2", padding: "12px 15px", borderRadius: "8px", fontSize: "13px", fontWeight: "bold" },
  barraDistribuidora: { display: "flex", height: "24px", borderRadius: "12px", overflow: "hidden", background: "#e2e8f0", width: "100%", marginTop: "15px", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)" },
  segmento: { height: "100%", transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)" },
  linhaCanal: { display: "flex", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #f1f5f9", fontSize: "14px", alignItems: "center", color: "#475569" },
  porcentagemLabel: { color: "#94a3b8", fontWeight: "normal", fontSize: "12px", marginLeft: "5px" }
};