// components/_tabsDashBoardLogista/ModalDevolucao.tsx

"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { Pedido } from "@/types/pedido";
import { aplicarMascara } from "@/utils/formatters";

interface ModalDevolucaoProps {
  pedido: Pedido;
  isOpen: boolean;
  onClose: () => void;
  onConfirmar: (dadosDevolucao: {
    motivo: string;
    isVoltaparaVenda: boolean;
    custoFreteReverso: number;
    reembolsarFreteCliente: boolean;
    vlFreteClienteReembolsado: number;
    vlReembolsoEfetivado: number;
    dsCodigoRastreioReverso: string;
  }) => void;
  formatarMoeda?: (valor: number) => string;
}

export const ModalDevolucao = ({
  pedido,
  isOpen,
  onClose,
  onConfirmar,
  formatarMoeda = (val) => `R$ ${Number(val || 0).toFixed(2).replace('.', ',')}`
}: ModalDevolucaoProps) => {
  const { theme } = useTheme();

  const [motivo, setMotivo] = useState("arrependimento");
  const [isVoltaparaVenda, setIsVoltaparaVenda] = useState<boolean>(true);
  const [reembolsarFreteCliente, setReembolsarFreteCliente] = useState<boolean>(false);
  const [codigoRastreioReverso, setCodigoRastreioReverso] = useState<string>("");

  // Extração estrita baseada exclusivamente nas propriedades oficiais do tipo Pedido / Financeiro
  const fin = pedido.financeiro || {};
  const log = pedido.logistica || {};
  const etiqueta = pedido.Etiqueta || {};

  const subtotalProdutos = Number(fin.vlSubtotal ?? 0);
  const descontoCupom = Number(fin.vlDesconto ?? 0);
  
  const valorBaseProduto = Math.max(0, subtotalProdutos - descontoCupom);

  const freteClienteValor = Number(fin.vlFrete ?? log.vlFrete ?? 0);
  const valorTotalPedido = Number(fin.vlTotal ?? 0);
  
  // Propriedades financeiras padronizadas com tipagem estrita
  const taxaCartao = 0;
  const comissaoVenda = 0;
  const custoEtiquetaIda = Number(etiqueta.vlValorCobrado ?? 0);

  const formaPagamento = String(fin.dsFormaPagamentoCarrinho || "Pix/Outros").trim();
  const origemPedido = String(pedido.dsOrigemPedido || "Site").trim();

  // Estados de inputs monetários formatados
  const [custoFreteReversoFormatado, setCustoFreteReversoFormatado] = useState("0,00");
  const [vlReembolsoFormatado, setVlReembolsoFormatado] = useState("0,00");

  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const calculoInicial = reembolsarFreteCliente 
        ? (valorBaseProduto + freteClienteValor) 
        : valorBaseProduto;

      setVlReembolsoFormatado(calculoInicial.toFixed(2).replace('.', ','));
      setCodigoRastreioReverso("");
    }
  }, [isOpen, reembolsarFreteCliente, valorBaseProduto, freteClienteValor]);

  if (!isOpen) return null;

  const converterParaNumeroPuro = (valorFormatado: string): number => {
    if (!valorFormatado) return 0;
    const apenasDigitos = valorFormatado.replace(/\D/g, "");
    if (!apenasDigitos) return 0;
    return Number((parseInt(apenasDigitos, 10) / 100).toFixed(2));
  };

  const handleFreteReversoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorDigitado = e.target.value;
    const valorComMascara = aplicarMascara(valorDigitado, 'dinheiro');
    setCustoFreteReversoFormatado(valorComMascara);
  };

  const handleReembolsoEfetivadoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorDigitado = e.target.value;
    const valorComMascara = aplicarMascara(valorDigitado, 'dinheiro');
    setVlReembolsoFormatado(valorComMascara);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);

    const custoPuro = converterParaNumeroPuro(custoFreteReversoFormatado);
    const reembolsoPuro = converterParaNumeroPuro(vlReembolsoFormatado);
    const vlFreteReembolsadoFinal = reembolsarFreteCliente ? freteClienteValor : 0;

    onConfirmar({
      motivo,
      isVoltaparaVenda,
      custoFreteReverso: custoPuro,
      reembolsarFreteCliente,
      vlFreteClienteReembolsado: vlFreteReembolsadoFinal,
      vlReembolsoEfetivado: reembolsoPuro,
      dsCodigoRastreioReverso: codigoRastreioReverso.trim(),
    });

    setCarregando(false);
    onClose();
  };

  const numeroPedidoFormatado = String(
    pedido.nrNumeroPedido || pedido.id?.slice(-4) || ""
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

        <p style={{ fontSize: "13px", color: theme.textSec, marginBottom: "14px" }}>
          Confira o resumo financeiro detalhado da compra antes de processar o estorno e definir os custos.
        </p>

        {/* 📊 PAINEL DE RESUMO FINANCEIRO COMPLETO */}
        <div style={{ 
          backgroundColor: theme.inputBg, 
          border: `1px solid ${theme.border}`, 
          borderRadius: "10px", 
          padding: "14px", 
          marginBottom: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          fontSize: "12px"
        }}>
          <div style={{ fontWeight: "700", borderBottom: `1px solid ${theme.border}`, paddingBottom: "6px", color: theme.textMain, display: "flex", justifyContent: "space-between" }}>
            <span>📊 Raio-X Financeiro da Venda</span>
            <span style={{ textTransform: "uppercase", fontSize: "11px", color: theme.textSec }}>({origemPedido} • {formaPagamento})</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div>
              <span style={{ color: theme.textSec, display: "block" }}>Subtotal Produtos:</span>
              <span style={{ fontWeight: "600" }}>{formatarMoeda(subtotalProdutos)}</span>
            </div>
            <div>
              <span style={{ color: theme.textSec, display: "block" }}>Desconto / Cupons:</span>
              <span style={{ fontWeight: "600", color: descontoCupom > 0 ? "#ef4444" : theme.textMain }}>
                - {formatarMoeda(descontoCupom)}
              </span>
            </div>
            <div>
              <span style={{ color: theme.textSec, display: "block" }}>Frete Pago pelo Cliente:</span>
              <span style={{ fontWeight: "600" }}>{formatarMoeda(freteClienteValor)}</span>
            </div>
            <div>
              <span style={{ color: theme.textSec, display: "block" }}>Valor Total Pago:</span>
              <strong style={{ fontSize: "13px", color: "#10b981" }}>{formatarMoeda(valorTotalPedido)}</strong>
            </div>
          </div>

          <div style={{ borderTop: `1px dashed ${theme.border}`, paddingTop: "8px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
            <div>
              <span style={{ color: theme.textSec, display: "block", fontSize: "11px" }}>Taxa Cartão:</span>
              <span style={{ color: "#ef4444", fontWeight: "600" }}>- {formatarMoeda(taxaCartao)}</span>
            </div>
            <div>
              <span style={{ color: theme.textSec, display: "block", fontSize: "11px" }}>Comissão:</span>
              <span style={{ color: "#ef4444", fontWeight: "600" }}>- {formatarMoeda(comissaoVenda)}</span>
            </div>
            <div>
              <span style={{ color: theme.textSec, display: "block", fontSize: "11px" }}>Custo Etiqueta (Ida):</span>
              <span style={{ color: "#ef4444", fontWeight: "600" }}>- {formatarMoeda(custoEtiquetaIda)}</span>
            </div>
          </div>
        </div>

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
              value={String(isVoltaparaVenda)}
              onChange={(e) => setIsVoltaparaVenda(e.target.value === "true")}
              style={{
                ...styles.select,
                backgroundColor: theme.inputBg,
                color: theme.textMain,
                borderColor: theme.border,
              }}
            >
              <option value="true">Perfeito / Lacrado (Volta para a prateleira/estoque)</option>
              <option value="false">Sucata / Perda Total (Inutilizável / Descarte)</option>
            </select>
          </div>

          {/* CÓDIGO DE RASTREIO REVERSO */}
          <div style={styles.formGroup}>
            <label style={{ ...styles.label, color: theme.textSec }}>
              Código de Rastreio Reverso (Opcional):
            </label>
            <input
              type="text"
              value={codigoRastreioReverso}
              onChange={(e) => setCodigoRastreioReverso(e.target.value)}
              style={{
                ...styles.input,
                backgroundColor: theme.inputBg,
                color: theme.textMain,
                borderColor: theme.border,
              }}
              placeholder="Ex: AB123456789BR"
            />
          </div>

          {/* REEMBOLSO DO FRETE PAGO PELO CLIENTE */}
          {freteClienteValor > 0 && (
            <div style={{ ...styles.formGroup, flexDirection: "row", alignItems: "center", gap: "10px", padding: "4px 0" }}>
              <input
                type="checkbox"
                id="reembolsarFrete"
                checked={reembolsarFreteCliente}
                onChange={(e) => setReembolsarFreteCliente(e.target.checked)}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <label htmlFor="reembolsarFrete" style={{ fontSize: "13px", cursor: "pointer", fontWeight: "600" }}>
                Reembolsar o frete de {formatarMoeda(freteClienteValor)} pago pelo cliente?
              </label>
            </div>
          )}

          {/* VALOR DO REEMBOLSO EFETIVADO */}
          <div style={styles.formGroup}>
            <label style={{ ...styles.label, color: theme.textSec }}>
              Valor do Reembolso Efetivado ao Cliente (R$):
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={vlReembolsoFormatado}
              onChange={handleReembolsoEfetivadoChange}
              style={{
                ...styles.input,
                backgroundColor: theme.inputBg,
                color: "#10b981",
                borderColor: theme.border,
                fontWeight: "700",
              }}
              placeholder="0,00"
            />
            <span style={{ fontSize: "11px", color: theme.textSec }}>
              * Sugerido automaticamente com base no valor do produto{reembolsarFreteCliente ? " + frete" : ""}. Você pode editar se necessário.
            </span>
          </div>

          {/* CUSTO DE FRETE REVERSO */}
          <div style={styles.formGroup}>
            <label style={{ ...styles.label, color: theme.textSec }}>
              Custo do Frete Reverso / Etiqueta Pago pela Loja (R$):
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={custoFreteReversoFormatado}
              onChange={handleFreteReversoChange}
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
  modalCard: { width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", padding: "24px", borderRadius: "16px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)", border: "1px solid", boxSizing: "border-box" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
  btnClose: { background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748b", fontWeight: "bold" },
  form: { display: "flex", flexDirection: "column", gap: "14px" },
  formGroup: { display: "flex", flexDirection: 'column', gap: "6px" },
  label: { fontSize: "12px", fontWeight: "700" },
  select: { padding: "10px 12px", borderRadius: "8px", border: "1px solid", fontSize: "13px", outline: "none", cursor: "pointer", width: "100%", boxSizing: "border-box" },
  input: { padding: "10px 12px", borderRadius: "8px", border: "1px solid", fontSize: "13px", outline: "none", width: "100%", boxSizing: "border-box" },
  footerActions: { display: 'flex', gap: "10px", justifyContent: "flex-end", marginTop: "10px" },
  btnPadrao: { padding: "10px 16px", borderRadius: "8px", fontSize: "13px", cursor: "pointer", border: "1px solid" },
};

export default ModalDevolucao;