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
    setShowToken,
    theme
}: any) {
    const [mostrarAjudaCupom, setMostrarAjudaCupom] = useState(false);
    const [mostrarAjudaFreteGratis, setMostrarAjudaFreteGratis] = useState(false);
    const [showTokenSandbox, setShowTokenSandbox] = useState(false);

    const currentTheme = theme || {
        bgCard: "#ffffff",
        textMain: "#1e293b",
        textSec: "#64748b",
        border: "#e2e8f0",
        inputBg: "#ffffff",
        primary: "#2563eb"
    };

    const isDark = currentTheme.inputBg !== "#ffffff";

    // Verifica se o plano atual do lojista possui liberação para o Sandbox
    const permiteSandbox = masterLiberou("temSandbox");
    const isSandboxAtivo = Boolean(config.melhorEnvioSandbox ?? config.sistema?.melhorEnvioSandbox ?? false);

    return (
        <section>
            <style jsx>{`
                .tooltip-container {
                    position: relative;
                    display: inline-flex;
                }
                .tooltip-container .tooltip-texto {
                    visibility: hidden;
                    width: 220px;
                    background-color: #1e293b;
                    color: #fff;
                    text-align: center;
                    border-radius: 6px;
                    padding: 8px;
                    position: absolute;
                    z-index: 100;
                    bottom: 125%;
                    left: 50%;
                    transform: translateX(-50%);
                    opacity: 0;
                    transition: opacity 0.2s;
                    font-size: 11px;
                    font-weight: normal;
                    line-height: 1.4;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .tooltip-container .tooltip-texto::after {
                    content: "";
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    margin-left: -5px;
                    border-width: 5px;
                    border-style: solid;
                    border-color: #1e293b transparent transparent transparent;
                }
                .tooltip-container:hover .tooltip-texto {
                    visibility: visible;
                    opacity: 1;
                }
            `}</style>

            {/* MARKETING / CUPONS */}
            {masterLiberou("temCupons") && (
                <div style={{ marginBottom: '25px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h3 style={{ ...styles.h3, marginTop: 0, marginBottom: 0, color: currentTheme.textMain }}>Marketing</h3>
                        <button type="button" onClick={() => setMostrarAjudaCupom(!mostrarAjudaCupom)} style={styles.btnInfo}>ℹ️</button>
                    </div>
                    {mostrarAjudaCupom && <div style={{ ...styles.tooltipBox, background: isDark ? '#1e293b' : '#e0f2fe', color: isDark ? '#38bdf8' : '#0369a1', border: `1px solid ${currentTheme.border}` }}>💡 Crie códigos promocionais para oferecer descontos.</div>}
                    <button type="button" onClick={() => setShowCupomModal(true)} style={{ ...styles.btnCupom, background: isDark ? '#1e293b' : '#f5f3ff', color: isDark ? '#c084fc' : '#8b5cf6', border: `1px solid ${currentTheme.border}` }}>🎟️ Gerenciar Cupons de Desconto</button>
                </div>
            )}

            {/* FRETE GRÁTIS */}
            {masterLiberou("temFreteGratis") && (
                <div style={{ marginBottom: '25px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h3 style={{ ...styles.h3, marginTop: 0, marginBottom: 0, color: currentTheme.textMain }}>Configuração de Frete Grátis</h3>
                        <button type="button" onClick={() => setMostrarAjudaFreteGratis(!mostrarAjudaFreteGratis)} style={styles.btnInfo}>ℹ️</button>
                    </div>
                    {mostrarAjudaFreteGratis && <div style={{ ...styles.tooltipBox, background: isDark ? '#1e293b' : '#e0f2fe', color: isDark ? '#38bdf8' : '#0369a1', border: `1px solid ${currentTheme.border}` }}>💡 Defina um valor mínimo para frete grátis.</div>}
                    <div style={{ background: config.sistema.isFreteGratisAtivo ? (isDark ? '#0c4a6e' : '#f0f9ff') : (isDark ? '#0f172a' : '#f8fafc'), padding: '15px', borderRadius: '12px', border: `1px solid ${currentTheme.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: currentTheme.textMain }}>Ativar Frete Grátis</span>
                            <input
                                type="checkbox"
                                checked={!!config.sistema.isFreteGratisAtivo}
                                onChange={e => setConfig({ ...config, sistema: { ...config.sistema, isFreteGratisAtivo: e.target.checked } })}
                            />
                        </div>
                        {config.sistema.isFreteGratisAtivo && (
                            <div style={{ marginTop: '10px' }}>
                                <label style={{ ...styles.label, color: currentTheme.textSec }}>Valor Mínimo (R$)</label>
                                <input
                                    style={{ ...styles.input, background: currentTheme.inputBg, color: currentTheme.textMain, border: `1px solid ${currentTheme.border}` }}
                                    value={config.sistema.vlFreteGratisMinimo || ""}
                                    onChange={e => setConfig({ ...config, sistema: { ...config.sistema, vlFreteGratisMinimo: aplicarMascara(e.target.value, 'dinheiro') } })}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* LOGÍSTICA E ENTREGA */}
            <h3 style={{ ...styles.h3, marginTop: '25px', color: currentTheme.textMain }}>Logística e Entrega</h3>
            <div style={{ opacity: masterLiberou("temLogistica") ? 1 : 0.6 }}>
                
                {permiteSandbox ? (
                    <>
                        <div style={{ marginBottom: '15px', background: isSandboxAtivo ? (isDark ? '#422006' : '#fefce8') : (isDark ? '#064e3b' : '#f0fdf4'), padding: '12px', borderRadius: '10px', border: `1px solid ${currentTheme.border}` }}>
                            <label style={{ ...styles.label, color: isSandboxAtivo ? '#facc15' : '#4ade80', fontWeight: 'bold' }}>Ambiente do Melhor Envio</label>
                            <select
                                style={{ ...styles.input, fontWeight: 'bold', background: currentTheme.inputBg, color: isSandboxAtivo ? '#facc15' : '#4ade80', border: `1px solid ${currentTheme.border}` }}
                                disabled={!masterLiberou("temLogistica")}
                                value={String(isSandboxAtivo)}
                                onChange={e => {
                                    const isSandboxVal = e.target.value === "true";
                                    setConfig({
                                        ...config,
                                        melhorEnvioSandbox: isSandboxVal,
                                        sistema: {
                                            ...config.sistema,
                                            melhorEnvioSandbox: isSandboxVal
                                        }
                                    });
                                }}
                            >
                                <option value="false" style={{ background: currentTheme.inputBg, color: currentTheme.textMain }}>🟢 PRODUÇÃO (Oficial - Clientes Reais)</option>
                                <option value="true" style={{ background: currentTheme.inputBg, color: currentTheme.textMain }}>🟡 SANDBOX (Testes - Homologação)</option>
                            </select>
                        </div>

                        {/* TOKEN DE PRODUÇÃO */}
                        <div style={{ marginBottom: '15px', opacity: isSandboxAtivo ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ ...styles.label, color: currentTheme.textSec }}>Token Melhor Envio (Produção)</label>
                                <button type="button" onClick={() => setShowToken(!showToken)} style={styles.btnToggleToken}>
                                    {showToken ? "Ocultar" : "Mostrar"}
                                </button>
                            </div>
                            <input
                                style={{ ...styles.input, background: currentTheme.inputBg, color: currentTheme.textMain, border: `1px solid ${currentTheme.border}` }}
                                type={showToken ? "text" : "password"}
                                disabled={!masterLiberou("temLogistica")}
                                value={config.sistema.dsTokenMelhorEnvio || ""}
                                onChange={e => setConfig({ ...config, sistema: { ...config.sistema, dsTokenMelhorEnvio: e.target.value } })}
                                placeholder="Cole seu token de produção aqui..."
                            />
                        </div>

                        {/* TOKEN DE SANDBOX */}
                        <div style={{ marginBottom: '15px', opacity: !isSandboxAtivo ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ ...styles.label, color: currentTheme.textSec }}>Token Melhor Envio (Sandbox)</label>
                                <button type="button" onClick={() => setShowTokenSandbox(!showTokenSandbox)} style={styles.btnToggleToken}>
                                    {showTokenSandbox ? "Ocultar" : "Mostrar"}
                                </button>
                            </div>
                            <input
                                style={{ ...styles.input, background: currentTheme.inputBg, color: currentTheme.textMain, border: `1px solid ${currentTheme.border}` }}
                                type={showTokenSandbox ? "text" : "password"}
                                disabled={!masterLiberou("temLogistica")}
                                value={config.sistema.dsTokenMelhorEnvioSandbox || ""}
                                onChange={e => setConfig({ ...config, sistema: { ...config.sistema, dsTokenMelhorEnvioSandbox: e.target.value } })}
                                placeholder="Cole seu token de sandbox aqui..."
                            />
                        </div>
                    </>
                ) : (
                    <div style={{ marginBottom: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ ...styles.label, color: currentTheme.textSec }}>Token Melhor Envio</label>
                            <button
                                type="button"
                                onClick={() => setShowToken(!showToken)}
                                style={styles.btnToggleToken}
                            >
                                {showToken ? "Ocultar" : "Mostrar"}
                            </button>
                        </div>
                        <input
                            style={{ ...styles.input, background: currentTheme.inputBg, color: currentTheme.textMain, border: `1px solid ${currentTheme.border}` }}
                            type={showToken ? "text" : "password"}
                            disabled={!masterLiberou("temLogistica")}
                            value={config.sistema.dsTokenMelhorEnvio || ""}
                            onChange={e => setConfig({ ...config, sistema: { ...config.sistema, dsTokenMelhorEnvio: e.target.value } })}
                            placeholder={masterLiberou("temLogistica") ? "Cole seu token aqui..." : "Bloqueado"}
                        />
                    </div>
                )}

                {/* AUTOMAÇÃO COMPLETA MELHOR ENVIO */}
                {masterLiberou("temAutomacaoFrete") && (
                    <div style={{ marginTop: '15px', background: config.sistema.isAutomacaoCompletaMelhorEnvio ? (isDark ? '#064e3b' : '#f0fdf4') : (isDark ? '#0f172a' : '#f8fafc'), padding: '15px', borderRadius: '12px', border: `1px solid ${currentTheme.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: currentTheme.textMain }}>Automação Completa de Etiquetas</span>
                            <input
                                type="checkbox"
                                checked={!!config.sistema.isAutomacaoCompletaMelhorEnvio}
                                onChange={e => setConfig({ ...config, sistema: { ...config.sistema, isAutomacaoCompletaMelhorEnvio: e.target.checked } })}
                            />
                        </div>
                    </div>
                )}

                {/* TRANSPORTADORAS ATIVAS */}
                <div style={{ marginTop: '15px', background: config.sistema.isTransportadoraAtivo ? (isDark ? '#0c4a6e' : '#f0f9ff') : (isDark ? '#0f172a' : '#f8fafc'), padding: '15px', borderRadius: '12px', border: `1px solid ${currentTheme.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: currentTheme.textMain }}>Ativar Cotação por Transportadoras</span>
                        <input
                            type="checkbox"
                            disabled={!masterLiberou("temLogistica")}
                            checked={!!config.sistema.isTransportadoraAtivo}
                            onChange={e => setConfig({ ...config, sistema: { ...config.sistema, isTransportadoraAtivo: e.target.checked } })}
                        />
                    </div>
                    {config.sistema.isTransportadoraAtivo && (
                        <div style={{ marginTop: '12px' }}>
                            <div style={{ ...styles.gridTransp, background: currentTheme.inputBg, border: `1px solid ${currentTheme.border}` }}>
                                {["azul", "correios", "jadlog", "latam"].map(t => (
                                    <label key={t} style={{ ...styles.transpItem, color: currentTheme.textMain }}>
                                        <input
                                            type="checkbox"
                                            checked={!!(config.sistema.dsTransportadoras?.[t])}
                                            onChange={() => {
                                                const atuais = config.sistema.dsTransportadoras || {};
                                                setConfig({
                                                    ...config,
                                                    sistema: { ...config.sistema, dsTransportadoras: { ...atuais, [t]: !atuais[t] } }
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
                <div style={{ marginTop: '15px', background: config.sistema.isFreteLocal ? (isDark ? '#0c4a6e' : '#f0f9ff') : (isDark ? '#0f172a' : '#f8fafc'), padding: '15px', borderRadius: '12px', border: `1px solid ${currentTheme.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: currentTheme.textMain }}>Entrega Local (Taxa Fixa)</span>
                        <input
                            type="checkbox"
                            checked={!!config.sistema.isFreteLocal}
                            onChange={e => setConfig({ ...config, sistema: { ...config.sistema, isFreteLocal: e.target.checked } })}
                        />
                    </div>
                    {config.sistema.isFreteLocal && (
                        <div style={{ marginTop: '10px' }}>
                            <label style={{ ...styles.label, color: currentTheme.textSec }}>Valor do Frete Fixo (R$)</label>
                            <input
                                style={{ ...styles.input, background: currentTheme.inputBg, color: currentTheme.textMain, border: `1px solid ${currentTheme.border}` }}
                                value={config.sistema.vlFreteLocal || ""}
                                onChange={e => setConfig({ ...config, sistema: { ...config.sistema, vlFreteLocal: aplicarMascara(e.target.value, 'dinheiro') } })}
                            />
                        </div>
                    )}
                </div>

                {/* RETIRADA NA LOJA */}
                <div style={{ marginTop: '15px', background: config.sistema.isRetiradaLoja ? (isDark ? '#0c4a6e' : '#f0f9ff') : (isDark ? '#0f172a' : '#f8fafc'), padding: '15px', borderRadius: '12px', border: `1px solid ${currentTheme.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: currentTheme.textMain }}>Retirada na Loja (Gratuita)</span>
                        <input
                            type="checkbox"
                            checked={!!config.sistema.isRetiradaLoja}
                            onChange={e => setConfig({ ...config, sistema: { ...config.sistema, isRetiradaLoja: e.target.checked } })}
                        />
                    </div>
                </div>
            </div>

            {/* STATUS DA LOJA */}
            <div style={{ marginTop: '25px', marginBottom: '8px' }}>
                <h3 style={{ ...styles.h3, color: currentTheme.textMain }}>Status da Loja</h3>
            </div>
            <select
                style={{ ...styles.input, background: currentTheme.inputBg, color: currentTheme.textMain, border: `1px solid ${currentTheme.border}` }}
                value={String(config.sistema?.isLojaAberta ?? true)}
                onChange={e => {
                    const valor = e.target.value === "true";
                    setConfig((prev: any) => ({ ...prev, sistema: { ...(prev.sistema || {}), isLojaAberta: valor } }));
                }}
            >
                <option value="true" style={{ background: currentTheme.inputBg, color: currentTheme.textMain }}>🟢 ABERTA PARA PEDIDOS</option>
                <option value="false" style={{ background: currentTheme.inputBg, color: currentTheme.textMain }}>🔴 VITRINE (CATÁLOGO)</option>
            </select>
        </section>
    );
}

const styles: any = {
    h3: { fontSize: "11px", fontWeight: "800", marginBottom: "12px", textTransform: 'uppercase', marginTop: '10px' },
    label: { fontSize: "11px", fontWeight: "600", marginBottom: "4px", display: 'block' },
    input: { width: "100%", padding: "12px", borderRadius: "10px", fontSize: "14px", outline: 'none', boxSizing: 'border-box', transition: 'background 0.3s' },
    btnCupom: { width: '100%', padding: '15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
    gridTransp: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '12px', borderRadius: '8px' },
    transpItem: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
    btnToggleToken: { background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', padding: 0 },
    btnInfo: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: 0 },
    tooltipBox: { marginTop: '8px', marginBottom: '10px', padding: '10px', borderRadius: '8px', fontSize: '11px', lineHeight: '1.4' }
};