// app/admin/_components/ModalGeradorCodBarrasVariacoes.tsx
"use client";

import React, { useState } from "react";
import { shopeeStyles } from "../produtos/styles";
import { useTheme } from "@/context/ThemeContext";

interface ModalGeradorCodBarrasVariacoesProps {
  onClose: () => void;
  onSave: (prefixoBase: string) => void;
}

export default function ModalGeradorCodBarrasVariacoes({
  onClose,
  onSave,
}: ModalGeradorCodBarrasVariacoesProps) {
  const { theme } = useTheme();
  const [prefixoBase, setPrefixoBase] = useState("789");

  const handleGerar = () => {
    onSave(prefixoBase.trim());
  };

  return (
    <div style={shopeeStyles.overlay}>
      <div
        style={{
          ...shopeeStyles.modal,
          backgroundColor: theme.bgCard,
          color: theme.textMain,
          border: `1px solid ${theme.border}`,
          width: "400px",
          maxWidth: "90%",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div
          style={{
            ...shopeeStyles.header,
            borderBottom: `1px solid ${theme.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ ...shopeeStyles.title, color: theme.textMain }}>
            Gerar EAN/GTIN Interno em Massa
          </h3>
          <button
            onClick={onClose}
            style={{ ...shopeeStyles.closeBtn, color: theme.textMain }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "15px" }}>
          <p style={{ fontSize: "13px", color: theme.textSec, lineHeight: "1.5", margin: 0 }}>
            Como você fabrica este produto, defina um prefixo numérico base. O sistema criará códigos de barras exclusivos de 13 dígitos para cada variação, permitindo o uso da pistola leitora.
          </p>

          <div>
            <label style={{ fontSize: "11px", color: theme.textSec, display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              Prefixo Numérico Base (Opcional)
            </label>
            <input
              type="text"
              maxLength={6}
              value={prefixoBase}
              onChange={(e) => setPrefixoBase(e.target.value.replace(/\D/g, ""))}
              placeholder="Ex: 789"
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: theme.inputBg,
                color: theme.textMain,
                border: `1px solid ${theme.border}`,
                borderRadius: "6px",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            padding: "15px 20px",
            borderTop: `1px solid ${theme.border}`,
            backgroundColor: theme.bgCard,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "9px 16px",
              borderRadius: "4px",
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.inputBg,
              color: theme.textMain,
              cursor: "pointer",
              fontWeight: "500",
              fontSize: "13px"
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGerar}
            style={{
              padding: "9px 24px",
              borderRadius: "4px",
              backgroundColor: theme.primary,
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "13px"
            }}
          >
            Gerar Códigos
          </button>
        </div>
      </div>
    </div>
  );
}
// app/admin/_components/ModalGeradorCodBarrasVariacoes.tsx
// este modal vai permitir que o lojista gere ou aplique um padrão numérico de 13 dígitos
// para todas as variações de forma automática (ótimo para quem fabrica os próprios
// produtos e precisa bipar com a pistola).