import React from "react";
import { FiUsers, FiTarget, FiTrendingDown, FiActivity } from "react-icons/fi";

// 1. Definição clara das interfaces para garantir a tipagem
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

interface TabMetricasProps {
  lojistas: any[]; // 'any' aqui pois os dados vêm do Firebase de forma dinâmica
}

export function TabMetricas({ lojistas }: TabMetricasProps) {
  const totalLojistas = lojistas.length;
  const emTeste = lojistas.filter((l: any) => l.isTeste).length;
  const pagantes = lojistas.filter((l: any) => !l.isTeste).length;

  // Lógica de Churn: Vencimento passou e ainda está em teste
  const hoje = new Date();
  const churnTeste = lojistas.filter((l: any) => {
    if (!l.dataVencimento) return false;
    const venc = new Date(l.dataVencimento);
    return l.isTeste && venc < hoje;
  }).length;

  const taxaConversao = totalLojistas > 0 
    ? ((pagantes / totalLojistas) * 100).toFixed(1) 
    : "0.0";

  return (
    <div style={styles.metricContainer}>
      <div style={styles.row}>
        <MetricCard title="Taxa de Conversão" value={`${taxaConversao}%`} icon={<FiTarget />} color="#3b82f6" />
        <MetricCard title="Assinantes Ativos" value={pagantes} icon={<FiUsers />} color="#10b981" />
        <MetricCard title="Em Período de Teste" value={emTeste} icon={<FiActivity />} color="#f59e0b" />
        <MetricCard title="Perdas (Pós-Teste)" value={churnTeste} icon={<FiTrendingDown />} color="#ef4444" />
      </div>

      <div style={styles.detailsCard}>
        <h4 style={styles.h4}>Análise de Upgrades</h4>
        <p style={styles.p}>Total de registros históricos: <strong>{totalLojistas}</strong></p>
      </div>
    </div>
  );
}

// 2. Componente de card devidamente tipado
function MetricCard({ title, value, icon, color }: MetricCardProps) {
  return (
    <div style={{...styles.miniCard, borderLeft: `4px solid ${color}`}}>
      <div style={{color: color, fontSize: '20px'}}>{icon}</div>
      <div>
        <small style={styles.miniLabel}>{title}</small>
        <h3 style={styles.miniValue}>{value}</h3>
      </div>
    </div>
  );
}

// 3. Adicione o objeto de estilos (se não estiver importado)
const styles: any = {
  metricContainer: { padding: '20px' },
  row: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
  miniCard: { background: '#fff', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', flex: '1', minWidth: '200px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  miniLabel: { fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' },
  miniValue: { margin: '0', fontSize: '18px', color: '#0f172a' },
  detailsCard: { marginTop: '20px', padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' },
  h4: { margin: '0 0 10px 0' },
  p: { margin: 0, fontSize: '14px', color: '#475569' }
};