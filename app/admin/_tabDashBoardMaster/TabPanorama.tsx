"use client";
import React from "react";
import { 
  FiUsers, FiAlertTriangle, FiActivity, FiDollarSign, FiPieChart, FiTarget, FiTrendingDown 
} from "react-icons/fi";

interface TabPanoramaProps {
  lojistas: any[];
  denuncias: any[];
  planos: any;
}

export default function TabPanorama({ lojistas, denuncias, planos }: TabPanoramaProps) {
  
  // 1. Lógica Dinâmica: Busca o preço ou usa 0
  const getPreco = (planoKey: string) => Number(planos[planoKey]?.preco || 0);

  const totalLojistas = lojistas.length;
  
  // 2. Filtro de Pagantes (Apenas quem NÃO é teste)
  const lojistasPagantes = lojistas.filter(l => !l.isTeste);
  const lojistasEmTeste = lojistas.filter(l => l.isTeste);

  // 3. Cálculos de Quantidade por Plano (Apenas Pagantes para o Financeiro)
  const dados = {
    Bronze: {
      qtdTotal: lojistas.filter(l => l.plano === "Bronze").length,
      qtdPagante: lojistasPagantes.filter(l => l.plano === "Bronze").length,
      cor: planos.Bronze?.cor || "#c2410c",
      preco: getPreco("Bronze")
    },
    Prata: {
      qtdTotal: lojistas.filter(l => l.plano === "Prata").length,
      qtdPagante: lojistasPagantes.filter(l => l.plano === "Prata").length,
      cor: planos.Prata?.cor || "#475569",
      preco: getPreco("Prata")
    },
    Ouro: {
      qtdTotal: lojistas.filter(l => l.plano === "Ouro").length,
      qtdPagante: lojistasPagantes.filter(l => l.plano === "Ouro").length,
      cor: planos.Ouro?.cor || "#a16207",
      preco: getPreco("Ouro")
    }
  };

  // Faturamento REAL (Apenas de quem já converteu/pagou)
  const faturamentoReal = {
    Bronze: dados.Bronze.qtdPagante * dados.Bronze.preco,
    Prata: dados.Prata.qtdPagante * dados.Prata.preco,
    Ouro: dados.Ouro.qtdPagante * dados.Ouro.preco,
  };

  const totalGeralReal = faturamentoReal.Bronze + faturamentoReal.Prata + faturamentoReal.Ouro;

  // 4. Métricas de Conversão
  const taxaConversao = totalLojistas > 0 ? ((lojistasPagantes.length / totalLojistas) * 100).toFixed(1) : 0;
  
  const hoje = new Date();
  const churnTeste = lojistasEmTeste.filter(l => {
    const venc = new Date(l.dataVencimento);
    return venc < hoje;
  }).length;

  // Proporções para o Gráfico de Volume (Total de Lojas)
  const totalQtd = totalLojistas || 1;
  const pOuro = (dados.Ouro.qtdTotal / totalQtd) * 100;
  const pPrata = (dados.Prata.qtdTotal / totalQtd) * 100;

  return (
    <div style={styles.panoramaContainer}>
      {/* 1ª LINHA: CARDS DE RESUMO */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{...styles.iconBox, color: '#3b82f6', backgroundColor: '#3b82f615'}}><FiUsers /></div>
          <div><p style={styles.statLabel}>Base de Lojistas</p><h3 style={styles.statValue}>{totalLojistas}</h3></div>
        </div>
        <div style={styles.statCard}>
          <div style={{...styles.iconBox, color: '#10b981', backgroundColor: '#10b98115'}}><FiDollarSign /></div>
          <div>
            <p style={styles.statLabel}>Receita Real (Pagantes)</p>
            <h3 style={{...styles.statValue, color: '#10b981'}}>
              {totalGeralReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{...styles.iconBox, color: '#f59e0b', backgroundColor: '#f59e0b15'}}><FiActivity /></div>
          <div><p style={styles.statLabel}>Em Período de Teste</p><h3 style={styles.statValue}>{lojistasEmTeste.length}</h3></div>
        </div>
      </div>

      {/* 2ª LINHA: GRÁFICOS E MÉTRICAS DE CONVERSÃO */}
      <div style={styles.row}>
        
        {/* VOLUME DE LOJAS */}
        <div style={styles.chartCard}>
          <div style={styles.cardHeader}>
            <h4 style={styles.cardTitle}><FiPieChart /> Distribuição de Planos</h4>
          </div>
          <div style={styles.donutContainer}>
             <svg width="140" height="140" viewBox="0 0 42 42" style={styles.donut}>
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4"></circle>
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={dados.Ouro.cor} strokeWidth="4" strokeDasharray={`${pOuro} ${100 - pOuro}`} strokeDashoffset="25"></circle>
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke={dados.Prata.cor} strokeWidth="4" strokeDasharray={`${pPrata} ${100 - pPrata}`} strokeDashoffset={25 - pOuro}></circle>
             </svg>
             <div style={styles.donutText}>
                <strong style={{fontSize: '20px', color: '#0f172a'}}>{totalLojistas}</strong>
                <span style={{fontSize: '9px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold'}}>Lojas</span>
             </div>
          </div>
          <div style={styles.legendVertical}>
              <div style={styles.legendRow}><span>Ouro (Total)</span> <strong>{dados.Ouro.qtdTotal}</strong></div>
              <div style={styles.legendRow}><span>Prata (Total)</span> <strong>{dados.Prata.qtdTotal}</strong></div>
              <div style={styles.legendRow}><span>Bronze (Total)</span> <strong>{dados.Bronze.qtdTotal}</strong></div>
          </div>
        </div>

        {/* FUNIL DE CONVERSÃO */}
        <div style={{...styles.chartCard, background: '#1e293b'}}>
           <div style={styles.cardHeader}>
              <h4 style={{...styles.cardTitle, color: '#f8fafc'}}><FiTarget /> Funil de Conversão</h4>
           </div>
           
           <div style={styles.funnelItem}>
              <div style={styles.funnelHeader}>
                 <span style={{color: '#94a3b8'}}>Taxa de Conversão</span>
                 <span style={{color: '#3b82f6', fontWeight: '900'}}>{taxaConversao}%</span>
              </div>
              <div style={styles.progressBase}><div style={{...styles.progressFill, width: `${taxaConversao}%`, backgroundColor: '#3b82f6'}} /></div>
           </div>

           <div style={styles.metricGridMini}>
              <div style={styles.miniMetric}>
                 <FiTarget color="#3b82f6" />
                 <div><small>Pagantes</small><strong>{lojistasPagantes.length}</strong></div>
              </div>
              <div style={styles.miniMetric}>
                 <FiTrendingDown color="#ef4444" />
                 <div><small>Perdas Teste</small><strong>{churnTeste}</strong></div>
              </div>
           </div>

           <div style={styles.infoBoxDark}>
              <p>O Faturamento Real ignora os <strong>{lojistasEmTeste.length} lojistas</strong> que ainda estão testando a plataforma.</p>
           </div>
        </div>

        {/* RECEITA POR PLANO */}
        <div style={styles.chartCard}>
          <div style={styles.cardHeader}>
            <h4 style={styles.cardTitle}><FiDollarSign /> Receita Real</h4>
          </div>
          <div style={styles.financeList}>
            {(['Ouro', 'Prata', 'Bronze'] as const).map((plano) => (
              <div key={plano} style={styles.financeItem}>
                <div style={styles.financeLabel}>
                  <span>{plano} <small style={{fontWeight: 'normal', color: '#94a3b8'}}>(Pagantes: {dados[plano].qtdPagante})</small></span>
                  <strong>{faturamentoReal[plano].toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                </div>
                <div style={styles.barContainer}>
                  <div 
                    style={{ 
                      ...styles.barFill, 
                      backgroundColor: dados[plano].cor,
                      width: totalGeralReal > 0 ? `${(faturamentoReal[plano] / totalGeralReal) * 100}%` : '0%'
                    }} 
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <div style={styles.totalFooter}>
            <span style={{fontSize: '11px', fontWeight: '800', color: '#94a3b8'}}>RECEITA LÍQUIDA ATUAL:</span>
            <h3 style={{fontSize: '24px', fontWeight: '900', color: '#10b981'}}>
              {totalGeralReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
          </div>
        </div>

      </div>
    </div>
  );
}

const styles: any = {
  panoramaContainer: { display: 'flex', flexDirection: 'column', gap: '25px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' },
  statCard: { background: '#fff', padding: '25px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)' },
  iconBox: { width: '54px', height: '54px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' },
  statLabel: { fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statValue: { fontSize: '26px', color: '#0f172a', fontWeight: '900', marginTop: '2px' },
  
  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' },
  chartCard: { background: '#fff', padding: '30px', borderRadius: '28px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', minHeight: '350px' },
  cardHeader: { marginBottom: '25px' },
  cardTitle: { fontSize: '15px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' },
  
  donutContainer: { position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: '25px' },
  donut: { transform: 'rotate(-90deg)' },
  donutText: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', display: 'flex', flexDirection: 'column' },
  legendVertical: { display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' },
  legendRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' },

  funnelItem: { marginBottom: '25px' },
  funnelHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' },
  progressBase: { height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' },
  progressFill: { height: '100%', transition: 'width 1s ease' },
  
  metricGridMini: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' },
  miniMetric: { background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '12px' },
  miniMetricLabel: { fontSize: '10px', color: '#94a3b8' },
  miniMetricValue: { fontSize: '16px', color: '#f8fafc', fontWeight: 'bold' },
  infoBoxDark: { background: 'rgba(59, 130, 246, 0.1)', padding: '15px', borderRadius: '15px', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#94a3b8', fontSize: '12px', lineHeight: '1.5' },

  financeList: { display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 },
  financeItem: { display: 'flex', flexDirection: 'column', gap: '8px' },
  financeLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', color: '#475569' },
  barContainer: { height: '10px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '10px', transition: 'width 1s ease-out' },
  
  totalFooter: { marginTop: 'auto', paddingTop: '20px', borderTop: '2px dashed #f1f5f9', textAlign: 'right' },
};