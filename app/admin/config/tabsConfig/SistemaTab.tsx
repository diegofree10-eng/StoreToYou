// app/admin/configuracoes/_components/SistemaTab.tsx
"use client";

import React, { useState } from "react";
import { aplicarMascara } from "@/utils/formatters";

export default function SistemaTab({
  config,
  setConfig,
  masterLiberou,
  setShowCupomModal,
  showToken,
  setShowToken
}: any) {
  // Estados para controlar a exibição dos balões de ajuda (tooltips) de cada seção
  const [mostrarAjudaCupom, setMostrarAjudaCupom] = useState(false);
  const [mostrarAjudaFreteGratis, setMostrarAjudaFreteGratis] = useState(false);
  const [mostrarAjudaTransp, setMostrarAjudaTransp] = useState(false);
  const [mostrarAjudaLocal, setMostrarAjudaLocal] = useState(false);
  const [mostrarAjudaRetirada, setMostrarAjudaRetirada] = useState(false);
  const [mostrarAjudaStatusLoja, setMostrarAjudaStatusLoja] = useState(false);

  return (
    <section>
      {/* MARKETING / CUPONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ ...styles.h3, marginTop: 0, marginBottom: 0 }}>Marketing</h3>
        <button
          type="button"
          onClick={() => setMostrarAjudaCupom(!mostrarAjudaCupom)}
          style={styles.btnInfo}
          title="Clique para mais informações"
        >
          ℹ️
        </button>
      </div>

      {mostrarAjudaCupom && (
        <div style={styles.tooltipBox}>
          💡 Crie códigos promocionais para oferecer descontos percentuais ou fixos aos seus clientes na finalização da compra.
        </div>
      )}

      <button
        type="button"
        disabled={!masterLiberou("temCupons")}
        onClick={() => setShowCupomModal(true)}
        style={masterLiberou("temCupons") ? styles.btnCupom : styles.btnDisabledTab}
      >
        {masterLiberou("temCupons") ? "🎟️ Gerenciar Cupons de Desconto" : "🔒 Cupons Bloqueados"}
      </button>

      {/* FRETE GRÁTIS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '25px', marginBottom: '8px' }}>
        <h3 style={{ ...styles.h3, marginTop: 0, marginBottom: 0 }}>Configuração de Frete Grátis</h3>
        <button
          type="button"
          onClick={() => setMostrarAjudaFreteGratis(!mostrarAjudaFreteGratis)}
          style={styles.btnInfo}
          title="Clique para mais informações"
        >
          ℹ️
        </button>
      </div>

      {mostrarAjudaFreteGratis && (
        <div style={styles.tooltipBox}>
          💡 Defina um valor mínimo de compra para que o cliente ganhe frete grátis automaticamente no carrinho.
        </div>
      )}

      <div style={{
        background: !masterLiberou("temFreteGratis") ? '#fafafa' : config.sistema.isFreteGratisAtivo ? '#f0f9ff' : '#f8fafc',
        padding: '15px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Ativar Frete Grátis</span>
          <input
            type="checkbox"
            disabled={!masterLiberou("temFreteGratis")}
            checked={!!config.sistema.isFreteGratisAtivo}
            onChange={e => setConfig({ ...config, sistema: { ...config.sistema, isFreteGratisAtivo: e.target.checked } })}
          />
        </div>
        {config.sistema.isFreteGratisAtivo && (
          <div style={{ marginTop: '10px' }}>
            <label style={styles.label}>Valor Mínimo (R$)</label>
            <input
              style={styles.input}
              value={config.sistema.vlFreteGratisMinimo || ""}
              onChange={e => setConfig({ ...config, sistema: { ...config.sistema, vlFreteGratisMinimo: aplicarMascara(e.target.value, 'dinheiro') } })}
            />
          </div>
        )}
      </div>

      {/* LOGÍSTICA E ENTREGA */}
      <h3 style={{ ...styles.h3, marginTop: '25px' }}>Logística e Entrega</h3>
      <div style={{ opacity: masterLiberou("temLogistica") ? 1 : 0.6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={styles.label}>Token Melhor Envio</label>
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            style={styles.btnToggleToken}
          >
            {showToken ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        <input
          style={styles.input}
          type={showToken ? "text" : "password"}
          disabled={!masterLiberou("temLogistica")}
          value={config.sistema.dsTokenMelhorEnvio || ""}
          onChange={e => setConfig({ ...config, sistema: { ...config.sistema, dsTokenMelhorEnvio: e.target.value } })}
          placeholder={masterLiberou("temLogistica") ? "Cole seu token aqui..." : "Bloqueado"}
        />

        {/* TRANSPORTADORAS ATIVAS (MASTER SWITCH) */}
        <div style={{
          marginTop: '15px',
          background: !masterLiberou("temLogistica") ? '#fafafa' : config.sistema.isTransportadoraAtivo ? '#f0f9ff' : '#f8fafc',
          padding: '15px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Ativar Cotação por Transportadoras</span>
              <button
                type="button"
                onClick={() => setMostrarAjudaTransp(!mostrarAjudaTransp)}
                style={styles.btnInfo}
                title="Clique para mais informações"
              >
                ℹ️
              </button>
            </div>
            <input
              type="checkbox"
              disabled={!masterLiberou("temLogistica")}
              checked={!!config.sistema.isTransportadoraAtivo}
              onChange={e => setConfig({ ...config, sistema: { ...config.sistema, isTransportadoraAtivo: e.target.checked } })}
            />
          </div>

          {mostrarAjudaTransp && (
            <div style={styles.tooltipBox}>
              💡 Ative para cotar fretes integrados via Melhor Envio e escolha abaixo quais transportadoras estarão disponíveis para os clientes.
            </div>
          )}

          {config.sistema.isTransportadoraAtivo && (
            <div style={{ marginTop: '12px' }}>
              <label style={{ ...styles.label, marginBottom: '6px' }}>Selecione as Transportadoras Disponíveis</label>
              <div style={styles.gridTransp}>
                {["azul", "correios", "jadlog", "latam"].map(t => (
                  <label
                    key={t}
                    style={{ ...styles.transpItem, cursor: masterLiberou("temLogistica") ? 'pointer' : 'not-allowed' }}
                  >
                    <input
                      type="checkbox"
                      disabled={!masterLiberou("temLogistica")}
                      checked={masterLiberou("temLogistica") ? !!(config.sistema.dsTransportadoras?.[t]) : false}
                      onChange={() => {
                        const transportadorasAtuais = config.sistema.dsTransportadoras || {};
                        const novas = {
                          ...transportadorasAtuais,
                          [t]: !transportadorasAtuais[t]
                        };

                        setConfig({
                          ...config,
                          sistema: {
                            ...config.sistema,
                            dsTransportadoras: novas
                          }
                        });
                      }}
                    />
                    <span style={{ textTransform: 'capitalize' }}>{t}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ENTREGA LOCAL */}
        <div style={{
          marginTop: '15px',
          background: !masterLiberou("temLogistica") ? '#fafafa' : config.sistema.isFreteLocal ? '#f0f9ff' : '#f8fafc',
          padding: '15px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Entrega Local (Taxa Fixa)</span>
              <button
                type="button"
                onClick={() => setMostrarAjudaLocal(!mostrarAjudaLocal)}
                style={styles.btnInfo}
                title="Clique para mais informações"
              >
                ℹ️
              </button>
            </div>
            <input
              type="checkbox"
              disabled={!masterLiberou("temLogistica")}
              checked={!!config.sistema.isFreteLocal}
              onChange={e => setConfig({ ...config, sistema: { ...config.sistema, isFreteLocal: e.target.checked } })}
            />
          </div>

          {mostrarAjudaLocal && (
            <div style={styles.tooltipBox}>
              💡 Ative esta opção caso você faça entregas presenciais ou motoboy na sua região. O cliente poderá selecionar esta modalidade no carrinho e será cobrado o valor fixo definido abaixo.
            </div>
          )}

          {config.sistema.isFreteLocal && (
            <div style={{ marginTop: '10px' }}>
              <label style={styles.label}>Valor do Frete Fixo (R$)</label>
              <input
                style={styles.input}
                disabled={!masterLiberou("temLogistica")}
                value={config.sistema.vlFreteLocal || ""}
                onChange={e => setConfig({ ...config, sistema: { ...config.sistema, vlFreteLocal: aplicarMascara(e.target.value, 'dinheiro') } })}
                placeholder="Ex: 10,00"
              />
            </div>
          )}
        </div>

        {/* RETIRADA NA LOJA */}
        <div style={{
          marginTop: '15px',
          background: !masterLiberou("temLogistica") ? '#fafafa' : config.sistema.isRetiradaLoja ? '#f0f9ff' : '#f8fafc',
          padding: '15px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Retirada na Loja (Gratuita)</span>
              <button
                type="button"
                onClick={() => setMostrarAjudaRetirada(!mostrarAjudaRetirada)}
                style={styles.btnInfo}
                title="Clique para mais informações"
              >
                ℹ️
              </button>
            </div>
            <input
              type="checkbox"
              disabled={!masterLiberou("temLogistica")}
              checked={!!config.sistema.isRetiradaLoja}
              onChange={e => setConfig({ ...config, sistema: { ...config.sistema, isRetiradaLoja: e.target.checked } })}
            />
          </div>

          {mostrarAjudaRetirada && (
            <div style={styles.tooltipBox}>
              💡 Permite que o cliente escolha retirar o pedido diretamente no seu endereço físico sem cobrança de taxa de frete.
            </div>
          )}
        </div>

        {!masterLiberou("temLogistica") && (
          <div style={styles.lockNotice}>
            🔒 Logística e Integrações indisponíveis no seu plano atual.
          </div>
        )}
      </div>

      {/* STATUS DA LOJA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '25px', marginBottom: '8px' }}>
        <h3 style={{ ...styles.h3, marginTop: 0, marginBottom: 0 }}>Status da Loja</h3>
        <button
          type="button"
          onClick={() => setMostrarAjudaStatusLoja(!mostrarAjudaStatusLoja)}
          style={styles.btnInfo}
          title="Clique para mais informações"
        >
          ℹ️
        </button>
      </div>

      {mostrarAjudaStatusLoja && (
        <div style={styles.tooltipBox}>
          💡 Alterne para "Vitrine (Catálogo)" se deseja exibir seus produtos sem permitir a conclusão de novos pedidos online no momento.
        </div>
      )}

      <select
        style={styles.input}
        value={String(config.sistema?.isLojaAberta ?? true)}
        onChange={e => {
          const valor = e.target.value === "true";
          setConfig((prev: any) => ({
            ...prev,
            sistema: {
              ...(prev.sistema || {}),
              isLojaAberta: valor
            }
          }));
        }}
      >
        <option value="true">🟢 ABERTA PARA PEDIDOS</option>
        <option value="false">🔴 VITRINE (CATÁLOGO)</option>
      </select>
    </section>
  );
}

const styles: any = {
  h3: { fontSize: "11px", fontWeight: "800", color: "#475569", marginBottom: "12px", textTransform: 'uppercase', marginTop: '10px' },
  label: { fontSize: "11px", fontWeight: "600", color: "#64748b", marginBottom: "4px", display: 'block' },
  input: { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "14px", outline: 'none', background: '#fff' },
  btnCupom: { width: '100%', padding: '15px', background: '#f5f3ff', color: '#8b5cf6', border: '1px solid #ddd6fe', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  btnDisabledTab: { width: '100%', padding: '15px', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 'bold', cursor: 'not-allowed' },
  gridTransp: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' },
  transpItem: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' },
  lockNotice: { padding: '12px', background: '#fff1f2', color: '#be123c', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #fecdd3', marginTop: '10px' },
  btnToggleToken: { background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', padding: 0 },
  btnInfo: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: 0 },
  tooltipBox: { marginTop: '8px', marginBottom: '10px', padding: '10px', background: '#e0f2fe', color: '#0369a1', borderRadius: '8px', fontSize: '11px', lineHeight: '1.4', border: '1px solid #bae6fd' }
};