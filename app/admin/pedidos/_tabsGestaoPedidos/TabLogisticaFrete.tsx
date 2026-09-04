// components/_tabsGestaoPedidos/TabLogisticaFrete.tsx
'use client';
import React, { useState, useMemo } from 'react';
import { Pedido } from '@/types/pedido';

interface TabLogisticaProps {
    pedidos: Pedido[];
    lojistaIdApp: string;
    db: any;
    dadosLoja: any;
    cotarFrete: (p: Pedido) => Promise<any[]>;
    loadingFreteAdmin: boolean;
    setModalProgresso: React.Dispatch<React.SetStateAction<any>>;
    setLocalPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;
}

export default function TabLogisticaFrete({
    pedidos, lojistaIdApp, cotarFrete, setModalProgresso, setLocalPedidos
}: TabLogisticaProps) {
    const [selecionados, setSelecionados] = useState<string[]>([]);
    const [processandoMassa, setProcessandoMassa] = useState(false);
    const [cotandoMassa, setCotandoMassa] = useState(false);

    const pedidosPendentes = useMemo(() => {
        return pedidos.filter(p => !p.etiquetaGerada && p.status !== 'Concluído');
    }, [pedidos]);

    const toggleSelectAll = () => {
        const ids = pedidosPendentes.map(p => p.id);
        const todos = ids.every(id => selecionados.includes(id));
        setSelecionados(todos ? [] : ids);
    };

    const cotarSelecionadosEmLote = async () => {
        if (selecionados.length === 0) return alert("Selecione ao menos um pedido para cotar.");
        setCotandoMassa(true);

        const alvos = pedidos.filter(p => selecionados.includes(p.id));
        let sucessos = 0;

        for (const pedido of alvos) {
            try {
                const opcoes = await cotarFrete(pedido);
                if (opcoes && opcoes.length > 0) {
                    const maisBarata = opcoes.reduce((prev, curr) => (curr.price < prev.price) ? curr : prev);

                    await fetch(`/api/frete/selecionar`, {
                        method: "POST",
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ lojistaId: lojistaIdApp, pedidoId: pedido.id, transportadoraId: maisBarata.id, nome: maisBarata.name })
                    });

                    sucessos++;
                    setLocalPedidos(prev => prev.map(p => p.id === pedido.id ? {
                        ...p,
                        financeiro: { ...p.financeiro, metodo: `Logística: ${maisBarata.name}`, dsTransportadoraId: String(maisBarata.id) }
                    } : p));
                }
            } catch (e) {
                console.error("Erro ao cotar pedido", pedido.id);
            }
        }

        setCotandoMassa(false);
        alert(`✅ Cotação em lote concluída! ${sucessos} pedidos precificados com a melhor tarifa.`);
    };

    const gerarEtiquetasEmLote = async () => {
        const aptos = pedidos.filter(p => {
            const idTransp = String((p.financeiro as any)?.dsTransportadoraId || "");
            return selecionados.includes(p.id) && idTransp && idTransp !== "frete_gratis_ativado" && !p.etiquetaGerada;
        });

        if (aptos.length === 0) return alert("Nenhum pedido selecionado possui transportadora cotada.");

        setModalProgresso({
            aberto: true,
            titulo: "Gerando etiquetas em lote...",
            itens: aptos.map(p => ({ id: p.id, numero: String((p as any).numeroPedido || p.numero || p.id.slice(-4)), status: 'processando' }))
        });

        setProcessandoMassa(true);

        for (const pedido of aptos) {
            try {
                const res = await fetch("/api/frete/gerar-massa", {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lojistaId: lojistaIdApp, orders: [pedido] })
                });
                const data = await res.json();

                setModalProgresso((prev: any) => ({
                    ...prev,
                    itens: prev.itens.map((i: any) => i.id === pedido.id ? {
                        ...i,
                        status: data.success ? 'sucesso' : 'erro',
                        mensagem: data.success ? "" : (data.errors?.[0]?.message || "Erro")
                    } : i)
                }));

                if (data.success) {
                    setLocalPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, etiquetaGerada: true, statusEtiqueta: 'paga' } : p));
                }
            } catch (err) {
                setModalProgresso((prev: any) => ({
                    ...prev,
                    itens: prev.itens.map((i: any) => i.id === pedido.id ? { ...i, status: 'erro', mensagem: "Erro de rede" } : i)
                }));
            }
        }
        setProcessandoMassa(false);
        setSelecionados([]);
    };

    const formatarData = (dataStr: string) => {
        if (!dataStr) return "";
        try {
            const data = new Date(dataStr);
            return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch {
            return dataStr;
        }
    };

    return (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px' }}>⚡ Central de Envio Rápido (Estilo Marketplace)</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Selecione os pedidos abaixo para cotar e emitir etiquetas em massa instantaneamente.</p>
                </div>

                {/* Barra de Ações Flutuante em Lote */}
                {selecionados.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px', backgroundColor: '#eff6ff', padding: '10px 16px', borderRadius: '8px', border: '1px solid #bfdbfe', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e40af' }}>{selecionados.length} selecionados</span>

                        <button onClick={cotarSelecionadosEmLote} disabled={cotandoMassa} style={{ padding: '8px 14px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                            {cotandoMassa ? "⏳ Cotando..." : "⚡ Cotar Mais Barata"}
                        </button>

                        <button onClick={gerarEtiquetasEmLote} disabled={processandoMassa} style={{ padding: '8px 14px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                            {processandoMassa ? "⏳ Emitindo..." : "🏷️ Emitir Etiquetas"}
                        </button>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '15px', border: '1px solid #e2e8f0' }}>
                <input type="checkbox" onChange={toggleSelectAll} checked={pedidosPendentes.length > 0 && pedidosPendentes.every(p => selecionados.includes(p.id))} style={{ transform: 'scale(1.2)', cursor: 'pointer' }} />
                <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#334155' }}>Selecionar todos os pedidos pendentes de envio</span>
            </div>

            {pedidosPendentes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Nenhum pedido pendente de logística no momento. 🎉</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                    {/* Cabeçalho das Colunas */}
                    <div style={{ display: 'grid', gridTemplateColumns: '40px 100px 1fr 1fr 150px 120px', gap: '15px', padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', color: '#64748b', borderBottom: '2px solid #e2e8f0', alignItems: 'center' }}>
                        <div></div>
                        <div>PEDIDO / ID</div>
                        <div>CLIENTE</div>
                        <div>ID DO PEDIDO</div>
                        <div>STATUS LOGÍSTICA</div>
                        <div style={{ textAlign: 'right' }}>TOTAL / DATA</div>
                    </div>

                    {/* Lista de Pedidos em Linhas Estruturadas */}
                    {pedidosPendentes.map(p => {
                        const idTransp = String((p.financeiro as any)?.dsTransportadoraId || "");
                        const cotado = idTransp.length > 0 && idTransp !== "frete_gratis_ativado";
                        const clienteObj = (p as any).dsCliente || (typeof p.cliente === 'object' && p.cliente !== null ? p.cliente : {});
                        const nomeCliente = typeof clienteObj === 'object' ? ((clienteObj as any)?.nmNomeCliente || (clienteObj as any)?.nome || (clienteObj as any)?.dsNomeCliente || "Cliente") : (p.cliente || "Cliente");
                        const numPedidoFormatado = String((p as any).numeroPedido || p.numero || p.id?.slice(-4) || "").padStart(5, '0');
                        
                        const enderecoObj = (p as any).dsEndereco || p.endereco || (p as any).cliente?.endereco || {};
                        const enderecoFormatado = [
                            (enderecoObj as any)?.dsRuaCliente || (enderecoObj as any)?.rua, 
                            (enderecoObj as any)?.dsNumeroCliente || (enderecoObj as any)?.numero, 
                            (enderecoObj as any)?.dsCidadeCliente || (enderecoObj as any)?.cidade
                        ].filter(Boolean).join(", ");

                        return (
                            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '40px 100px 1fr 1fr 150px 120px', gap: '15px', padding: '14px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>

                                {/* Coluna 1: Checkbox */}
                                <div>
                                    <input
                                        type="checkbox"
                                        checked={selecionados.includes(p.id)}
                                        onChange={() => setSelecionados(prev => prev.includes(p.id) ? prev.filter(i => i !== p.id) : [...prev, p.id])}
                                        style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                    />
                                </div>

                                {/* Coluna 2: Número do Pedido*/}
                                <div>
                                    <div style={{ fontWeight: 'bold', color: '#3b82f6', fontSize: '14px' }}>
                                        #{numPedidoFormatado}
                                    </div>
                                </div>

                                {/* Coluna 3: Fotos + Nome do Cliente */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', flexShrink: 0 }}>
                                        {Array.isArray(p.itens) && p.itens.length > 0 ? (
                                            p.itens.map((item: any, idx: number) => (
                                                <img
                                                    key={idx}
                                                    src={item.foto || item.imagem || item.url || "https://placehold.co/35x35?text=Produto"}
                                                    alt={item.nome || "Produto"}
                                                    style={{ width: '35px', height: '35px', borderRadius: '6px', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', marginLeft: idx > 0 ? '-12px' : '0' }}
                                                    title={`${item.qty || 1}x ${item.nome}`}
                                                />
                                            ))
                                        ) : (
                                            <div style={{ width: '35px', height: '35px', borderRadius: '6px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>📦</div>
                                        )}
                                    </div>
                                    <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={nomeCliente}>
                                        {nomeCliente}
                                    </div>
                                </div>

                                <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace', wordBreak: 'break-all' }} title={p.id}>
                                    ID: {p.id}
                                </div>

                                {/* Coluna 5: Status de Logística */}
                                <div>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', backgroundColor: cotado ? '#ecfdf5' : '#fffbeb', color: cotado ? '#059669' : '#d97706', border: `1px solid ${cotado ? '#a7f3d0' : '#fde68a'}`, display: 'inline-block' }}>
                                        {cotado ? `Pronta: ${(p.financeiro as any)?.metodo}` : '⚠️ Sem cotação'}
                                    </span>
                                </div>

                                {/* Coluna 6: Total e Data */}
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>
                                        R$ {Number((p.financeiro as any)?.vlTotal || (p.financeiro as any)?.total || (p as any).total || 0).toFixed(2).replace('.', ',')}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                                        {formatarData(p.data || (typeof p.cliente === 'object' ? (p.cliente as any)?.data : ""))}
                                    </div>
                                </div>

                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}