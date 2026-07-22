"use client";

import React from "react";

interface CamposPersonalizacaoProps {
  itemKey: string;
  requisitosAtivos: any;
  personalizacoes: Record<string, Record<string, string>>;
  corTexto: string;
  onUpdateField: (key: string, campoId: string, valor: string) => void;
}

export default function CamposPersonalizacao({
  itemKey,
  requisitosAtivos,
  personalizacoes,
  corTexto,
  onUpdateField,
}: CamposPersonalizacaoProps) {
  return (
    <div style={localStyles.container}>
      <span style={{ ...localStyles.title, color: corTexto }}>
        Campos de Personalização:
      </span>

      {Array.isArray(requisitosAtivos) ? (
        requisitosAtivos.map((req: any) => {
          if (!req || (!req.label && !req.id)) return null;
          return (
            <div key={req.id} style={localStyles.fieldGroup}>
              <label style={localStyles.label}>
                {req.label || "Campo"}{" "}
                {req.obrigatorio && <span style={localStyles.required}>*</span>}
              </label>
              <input
                type={
                  req.tipo === "date"
                    ? "date"
                    : req.tipo === "number"
                    ? "number"
                    : "text"
                }
                maxLength={req.tipo === "time" ? 5 : undefined}
                placeholder={
                  req.tipo === "time"
                    ? "Ex: 14:30"
                    : `Digite o(a) ${req.label || "informação"}`
                }
                required={!!req.obrigatorio}
                value={personalizacoes[itemKey]?.[String(req.id)] || ""}
                onChange={(e) => onUpdateField(itemKey, req.id, e.target.value)}
                style={localStyles.input}
              />
            </div>
          );
        })
      ) : (
        typeof requisitosAtivos === "object" && (
          <>
            {requisitosAtivos.pedeNome && (
              <div style={localStyles.fieldGroup}>
                <label style={localStyles.label}>
                  Nome para personalização <span style={localStyles.required}>*</span>
                </label>
                <input
                  placeholder="Digite o nome completo"
                  value={personalizacoes[itemKey]?.nome || ""}
                  onChange={(e) => onUpdateField(itemKey, "nome", e.target.value)}
                  style={localStyles.input}
                />
              </div>
            )}
            {requisitosAtivos.pedeIdade && (
              <div style={localStyles.fieldGroup}>
                <label style={localStyles.label}>
                  Idade <span style={localStyles.required}>*</span>
                </label>
                <input
                  placeholder="Digite a idade"
                  type="text"
                  value={personalizacoes[itemKey]?.idade || ""}
                  onChange={(e) => onUpdateField(itemKey, "idade", e.target.value)}
                  style={localStyles.input}
                />
              </div>
            )}
            {requisitosAtivos.pedeData && (
              <div style={localStyles.fieldGroup}>
                <label style={localStyles.label}>
                  Data do Evento <span style={localStyles.required}>*</span>
                </label>
                <input
                  type="date"
                  value={personalizacoes[itemKey]?.data || ""}
                  onChange={(e) => onUpdateField(itemKey, "data", e.target.value)}
                  style={localStyles.input}
                />
              </div>
            )}
            {requisitosAtivos.pedeObs && (
              <div style={localStyles.fieldGroup}>
                <label style={localStyles.label}>Observações</label>
                <input
                  placeholder="Observações adicionais"
                  value={personalizacoes[itemKey]?.obs || ""}
                  onChange={(e) => onUpdateField(itemKey, "obs", e.target.value)}
                  style={localStyles.input}
                />
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}

const localStyles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: 12,
    padding: "12px",
    background: "#f8fafc",
    borderRadius: "10px",
    border: "1px dashed #cbd5e1",
  },
  title: {
    fontSize: 11,
    fontWeight: "bold",
    display: "block",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  fieldGroup: { marginBottom: 10 },
  label: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#475569",
    display: "block",
    marginBottom: "4px",
  },
  required: { color: "#ef4444" },
  input: {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #eee",
    outline: "none",
    boxSizing: "border-box",
    fontSize: 13,
    height: "auto",
    background: "#fff",
  },
};