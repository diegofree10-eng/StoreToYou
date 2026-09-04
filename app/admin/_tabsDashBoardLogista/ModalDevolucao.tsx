// components/_tabsDashBoardLogista/ModalDevolucao.tsx

"use client";

import React, { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { Pedido } from "@/types/pedido";
import { aplicarMascara } from "@/utils/formatters"; // 🌟 Importando o seu formatters existente

interface ModalDevolucaoProps {
  pedido: Pedido;
  isOpen: boolean;
  onClose: () => void;
  onConfirmar: (dadosDevolucao: {
    motivo: string;
    estadoProduto: string; // "perfeito" ou "sucata"
    custoFreteReverso: number; // Número puro pronto para o banco
  }) => void;
}

export const ModalDevolucao = ({
  pedido,
  isOpen,
  onClose,
  onConfirmar,
}: ModalDevolucaoProps) => {
  const { theme } = useTheme();

  const [motivo, setMotivo] = useState("arrependimento");
  const [estadoProduto, setEstadoProduto] = useState("perfeito");
  
  // O input guarda a string formatada visualmente (ex: "12,50")
  const [custoFreteReversoFormatado, setCustoFreteReversoFormatado] = useState("0,00");
  const [carregando, setCarregando] = useState(false);

  if (!isOpen) return null;

  // 🧮 Função que converte a string formatada em número puro (ex: "1.250,30" -> 1250.30)
  const converterParaNumeroPuro = (valorFormatado: string): number => {
    if (!valorFormatado) return 0;
    const apenasDigitos = valorFormatado.replace(/\D/g, "");
    if (!apenasDigitos) return 0;
    return Number((parseInt(apenasDigitos, 10) / 100).toFixed(2));
  };

  const handleDinheiroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorDigitado = e.target.value;
    // Aplica a máscara de dinheiro estilo caixa eletrônico da sua utils
    const valorComMascara = aplicarMascara(valorDigitado, 'dinheiro');
    setCustoFreteReversoFormatado(valorComMascara);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);

    // Converte para número puro antes de enviar para a função de salvamento
    const custoPuro = converterParaNumeroPuro(custoFreteReversoFormatado);

    onConfirmar({
      motivo,
      estadoProduto,
      custoFreteReverso: custoPuro,
    });

    setCarregando(false);
    onClose();
  };

  const numeroPedidoFormatado = String(
    pedido.numeroPedido || pedido.numero || pedido.id?.slice(-4) || ""
  );

  return (
    <div style={styles.overlay}>
      <div
        style={{
          ...styles.modalCard,
          backgroundColor: theme.bgCard,
          borderColor: theme.border,
          color: theme.textMain,
        }}
      >
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>🔄</span>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800" }}>
              Registrar Devolução do Pedido #{numeroPedidoFormatado}
            </h3>
          </div>
          <button onClick={onClose} style={styles.btnClose}>
            ✕
          </button>
        </div>

        <p style={{ fontSize: "13px", color: theme.textSec, marginBottom: "20px" }}>
          Informe o motivo, a condição física do produto retornado e os custos operacionais.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          
          {/* MOTIVO DA DEVOLUÇÃO */}
          <div style={styles.formGroup}>
            <label style={{ ...styles.label, color: theme.textSec }}>
              Motivo Principal da Devolução:
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              style={{
                ...styles.select,
                backgroundColor: theme.inputBg,
                color: theme.textMain,
                borderColor: theme.border,
              }}
            >
              <option value="arrependimento">Arrependimento / Desistência (CDC 7 dias)</option>
              <option value="defeito_fabricacao">Defeito de Fabricação / Falha</option>
              <option value="tamanho_inadequado">Tamanho ou Numeração inadequada</option>
              <option value="avaria_transporte">Avaria / Danificado no Transporte</option>
              <option value="erro_expedicao">Erro Interno (Loja enviou produto errado)</option>
              <option value="nao_informado">Não informado pelo cliente</option>
            </select>
          </div>

          {/* ESTADO DO PRODUTO */}
          <div style={styles.formGroup}>
            <label style={{ ...styles.label, color: theme.textSec }}>
              Condição do Produto ao Retornar:
            </label>
            <select
              value={estadoProduto}
              onChange={(e) => setEstadoProduto(e.target.value)}
              style={{
                ...styles.select,
                backgroundColor: theme.inputBg,
                color: theme.textMain,
                borderColor: theme.border,
              }}
            >
              <option value="perfeito">Perfeito / Lacrado (Pode voltar pra prateleira)</option>
              <option value="sucata">Sucata / Perda Total (Inutilizável / Descarte)</option>
            </select>
          </div>

          {/* CUSTO DE FRETE REVERSO (COM MÁSCARA DE CAIXA ELETRÔNICO) */}
          <div style={styles.formGroup}>
            <label style={{ ...styles.label, color: theme.textSec }}>
              Custo do Frete Reverso / Etiqueta (R$):
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={custoFreteReversoFormatado}
              onChange={handleDinheiroChange}
              style={{
                ...styles.input,
                backgroundColor: theme.inputBg,
                color: theme.textMain,
                borderColor: theme.border,
              }}
              placeholder="0,00"
            />
          </div>

          {/* AÇÕES */}
          <div style={styles.footerActions}>
            <button
              type="button"
              onClick={onClose}
              style={{
                ...styles.btnPadrao,
                backgroundColor: theme.inputBg,
                color: theme.textMain,
                borderColor: theme.border,
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={carregando}
              style={{
                ...styles.btnPadrao,
                backgroundColor: "#ef4444",
                color: "#ffffff",
                border: "none",
                fontWeight: "700",
              }}
            >
              {carregando ? "Processando..." : "Confirmar Devolução"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px" },
  modalCard: { width: "100%", maxWidth: "480px", padding: "24px", borderRadius: "16px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)", border: "1px solid", boxSizing: "border-box" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
  btnClose: { background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748b", fontWeight: "bold" },
  form: { display: "flex", flexDirection: "column", gap: "14px" },
  formGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "12px", fontWeight: "700" },
  select: { padding: "10px 12px", borderRadius: "8px", border: "1px solid", fontSize: "13px", outline: "none", cursor: "pointer", width: "100%", boxSizing: "border-box" },
  input: { padding: "10px 12px", borderRadius: "8px", border: "1px solid", fontSize: "13px", outline: "none", width: "100%", boxSizing: "border-box" },
  footerActions: { display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" },
  btnPadrao: { padding: "10px 16px", borderRadius: "8px", fontSize: "13px", cursor: "pointer", border: "1px solid" },
};