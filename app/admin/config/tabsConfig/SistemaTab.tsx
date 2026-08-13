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
    const [mostrarAjudaCupom, setMostrarAjudaCupom] = useState(false);
    const [mostrarAjudaFreteGratis, setMostrarAjudaFreteGratis] = useState(false);
    const [mostrarAjudaTransp, setMostrarAjudaTransp] = useState(false);
    const [mostrarAjudaLocal, setMostrarAjudaLocal] = useState(false);
    const [mostrarAjudaRetirada, setMostrarAjudaRetirada] = useState(false);
    const [mostrarAjudaStatusLoja, setMostrarAjudaStatusLoja] = useState(false);
    const [mostrarAjudaAutomacao, setMostrarAjudaAutomacao] = useState(false);
    const [showTokenSandbox, setShowTokenSandbox] = useState(false);

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
                        <h3 style={{ ...styles.h3, marginTop: 0, marginBottom: 0 }}>Marketing</h3>
                        <button type="button" onClick={() => setMostrarAjudaCupom(!mostrarAjudaCupom)} style={styles.btnInfo}>ℹ️</button>
                    </div>
                    {mostrarAjudaCupom && <div style={styles.tooltipBox}>💡 Crie códigos promocionais para oferecer descontos.</div>}
                    <button type="button" onClick={() => setShowCupomModal(true)} style={styles.btnCupom}>🎟️ Gerenciar Cupons de Desconto</button>
                </div>
            )}

            {/* FRETE GRÁTIS */}
            {masterLiberou("temFreteGratis") && (
                <div style={{ marginBottom: '25px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h3 style={{ ...styles.h3, marginTop: 0, marginBottom: 0 }}>Configuração de Frete Grátis</h3>
                        <button type="button" onClick={() => setMostrarAjudaFreteGratis(!mostrarAjudaFreteGratis)} style={styles.btnInfo}>ℹ️</button>
                    </div>
                    {mostrarAjudaFreteGratis && <div style={styles.tooltipBox}>💡 Defina um valor mínimo para frete grátis.</div>}
                    <div style={{ background: config.sistema.isFreteGratisAtivo ? '#f0f9ff' : '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Ativar Frete Grátis</span>
                            <input
                                type="checkbox"
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
                </div>
            )}

            {/* LOGÍSTICA E ENTREGA */}
            <h3 style={{ ...styles.h3, marginTop: '25px' }}>Logística e Entrega</h3>
            <div style={{ opacity: masterLiberou("temLogistica") ? 1 : 0.6 }}>
                
                {/* SE O PLANO DO LOJISTA TEM DIREITO AO SANDBOX (ex: Diamante), EXIBE O SELECT E OS DOIS TOKENS */}
                {permiteSandbox ? (
                    <>
                        <div style={{ marginBottom: '15px', background: isSandboxAtivo ? '#fefce8' : '#f0fdf4', padding: '12px', borderRadius: '10px', border: isSandboxAtivo ? '1px solid #fde047' : '1px solid #bbf7d0' }}>
                            <label style={{ ...styles.label, color: isSandboxAtivo ? '#854d0e' : '#166534', fontWeight: 'bold' }}>Ambiente do Melhor Envio</label>
                            <select
                                style={{ ...styles.input, fontWeight: 'bold', color: isSandboxAtivo ? '#ca8a04' : '#16a34a' }}
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
                                <option value="false">🟢 PRODUÇÃO (Oficial - Clientes Reais)</option>
                                <option value="true">🟡 SANDBOX (Testes - Homologação)</option>
                            </select>
                        </div>

                        {/* TOKEN DE PRODUÇÃO */}
                        <div style={{ marginBottom: '15px', opacity: isSandboxAtivo ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={styles.label}>Token Melhor Envio (Produção)</label>
                                <button type="button" onClick={() => setShowToken(!showToken)} style={styles.btnToggleToken}>
                                    {showToken ? "Ocultar" : "Mostrar"}
                                </button>
                            </div>
                            <input
                                style={styles.input}
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
                                <label style={styles.label}>Token Melhor Envio (Sandbox)</label>
                                <button type="button" onClick={() => setShowTokenSandbox(!showTokenSandbox)} style={styles.btnToggleToken}>
                                    {showTokenSandbox ? "Ocultar" : "Mostrar"}
                                </button>
                            </div>
                            <input
                                style={styles.input}
                                type={showTokenSandbox ? "text" : "password"}
                                disabled={!masterLiberou("temLogistica")}
                                value={config.sistema.dsTokenMelhorEnvioSandbox || ""}
                                onChange={e => setConfig({ ...config, sistema: { ...config.sistema, dsTokenMelhorEnvioSandbox: e.target.value } })}
                                placeholder="Cole seu token de sandbox aqui..."
                            />
                        </div>
                    </>
                ) : (
                    /* SE O PLANO NÃO TEM DIREITO, MOSTRA APENAS O CAMPO ÚNICO DE PRODUÇÃO */
                    <div style={{ marginBottom: '15px' }}>
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
                    </div>
                )}

                {/* AUTOMAÇÃO COMPLETA MELHOR ENVIO */}
                {masterLiberou("temAutomacaoFrete") && (
                    <div style={{ marginTop: '15px', background: config.sistema.isAutomacaoCompletaMelhorEnvio ? '#f0fdf4' : '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Automação Completa de Etiquetas</span>
                            <input
                                type="checkbox"
                                checked={!!config.sistema.isAutomacaoCompletaMelhorEnvio}
                                onChange={e => setConfig({ ...config, sistema: { ...config.sistema, isAutomacaoCompletaMelhorEnvio: e.target.checked } })}
                            />
                        </div>
                    </div>
                )}

                {/* TRANSPORTADORAS ATIVAS */}
                <div style={{ marginTop: '15px', background: config.sistema.isTransportadoraAtivo ? '#f0f9ff' : '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Ativar Cotação por Transportadoras</span>
                        <input
                            type="checkbox"
                            disabled={!masterLiberou("temLogistica")}
                            checked={!!config.sistema.isTransportadoraAtivo}
                            onChange={e => setConfig({ ...config, sistema: { ...config.sistema, isTransportadoraAtivo: e.target.checked } })}
                        />
                    </div>
                    {config.sistema.isTransportadoraAtivo && (
                        <div style={{ marginTop: '12px' }}>
                            <div style={styles.gridTransp}>
                                {["azul", "correios", "jadlog", "latam"].map(t => (
                                    <label key={t} style={styles.transpItem}>
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
                <div style={{ marginTop: '15px', background: config.sistema.isFreteLocal ? '#f0f9ff' : '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Entrega Local (Taxa Fixa)</span>
                        <input
                            type="checkbox"
                            checked={!!config.sistema.isFreteLocal}
                            onChange={e => setConfig({ ...config, sistema: { ...config.sistema, isFreteLocal: e.target.checked } })}
                        />
                    </div>
                    {config.sistema.isFreteLocal && (
                        <div style={{ marginTop: '10px' }}>
                            <label style={styles.label}>Valor do Frete Fixo (R$)</label>
                            <input
                                style={styles.input}
                                value={config.sistema.vlFreteLocal || ""}
                                onChange={e => setConfig({ ...config, sistema: { ...config.sistema, vlFreteLocal: aplicarMascara(e.target.value, 'dinheiro') } })}
                            />
                        </div>
                    )}
                </div>

                {/* RETIRADA NA LOJA */}
                <div style={{ marginTop: '15px', background: config.sistema.isRetiradaLoja ? '#f0f9ff' : '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Retirada na Loja (Gratuita)</span>
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
                <h3 style={styles.h3}>Status da Loja</h3>
            </div>
            <select
                style={styles.input}
                value={String(config.sistema?.isLojaAberta ?? true)}
                onChange={e => {
                    const valor = e.target.value === "true";
                    setConfig((prev: any) => ({ ...prev, sistema: { ...(prev.sistema || {}), isLojaAberta: valor } }));
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
    gridTransp: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' },
    transpItem: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' },
    btnToggleToken: { background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', padding: 0 },
    btnInfo: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: 0 },
    tooltipBox: { marginTop: '8px', marginBottom: '10px', padding: '10px', background: '#e0f2fe', color: '#0369a1', borderRadius: '8px', fontSize: '11px', lineHeight: '1.4', border: '1px solid #bae6fd' }
};