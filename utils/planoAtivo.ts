export const getPlanoEfetivo = (lojaDados: any, planosDoBanco: any) => {
  // Se não temos dados, retornamos um padrão seguro para evitar quebras
  if (!lojaDados || !planosDoBanco) {
    return {
      nome: "Bronze",
      isTesteAtivo: false,
      configs: { tipoDashboard: 'bronze', limiteProdutos: 10, limiteCategorias: 3, temRelatorioAvancado: false }
    };
  }

  const sistema = lojaDados?.sistema || {};
  const isTesteAtivo = sistema.isTesteOuroAtivo === true;
  
  // 1. Definição do nome do plano: Teste (dsPlanoTeste) tem prioridade absoluta.
  const nomePlano = (isTesteAtivo && sistema.dsPlanoTeste) 
    ? sistema.dsPlanoTeste 
    : (lojaDados?.dadosLoja?.dsPlanoLoja || "Bronze");

  // 2. Busca os dados no objeto vindo do banco (configuracoes/planos)
  const dados = planosDoBanco[nomePlano] || planosDoBanco["Bronze"] || { 
    produtos: 10, 
    categorias: 3, 
    modeloDash: "bronze" 
  };

  // 3. Lógica do Dashboard:
  const eGestao = dados.modeloDash === 'completo';

  return {
    nome: nomePlano,
    isTesteAtivo,
    configs: {
      tipoDashboard: eGestao ? 'gestao' : 'bronze',
      limiteProdutos: Number(dados.produtos ?? 10),
      limiteCategorias: Number(dados.categorias ?? 3),
      temRelatorioAvancado: !!dados.temSuporte
    }
  };
};