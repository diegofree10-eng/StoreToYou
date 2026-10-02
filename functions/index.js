const admin = require("firebase-admin");
admin.initializeApp();

// 1. Importação de cada função isolada da pasta /funcs (Total de 13 arquivos agora)
const { atualizarEstatisticasVenda } = require("./funcs/atualizarEstatisticasVenda");
const { prepararNovoLojista } = require("./funcs/prepararNovoLojista");
const { reverterPlanosVencidos } = require("./funcs/reverterPlanosVencidos");
const { verificarPagamentoLojistas } = require("./funcs/verificarPagamentoLojistas");
const { contabilizarVendaPdvV2 } = require("./funcs/contabilizarVendaPdvV2");
const { darBaixaEstoqueUniversal } = require("./funcs/darBaixaEstoqueUniversal");
const { atualizarDevolucaoPedido } = require("./funcs/atualizarDevolucaoPedido");
const { atualizarEstatisticasDespesasFixas } = require("./funcs/atualizarEstatisticasDespesasFixas");
const { atualizarEstatisticasDespesasVariaveis } = require("./funcs/atualizarEstatisticasDespesasVariaveis");
const { contabilizarFaturamentoAssinaturasMaster } = require("./funcs/contabilizarFaturamentoAssinaturasMaster");
const { processarMasterDashboard } = require("./funcs/atualizarMasterDashboard");
const { processarRankingProdutosClientes } = require("./funcs/atualizarRankingProdutosClientes");
const { darBaixaEstoqueEmbalagemPedido } = require("./funcs/darBaixaEstoqueEmbalagemPedido.js"); // 🌟 ADICIONADO AQUI
const { criarTicketSuporte } = require("./funcs/criarTicketSuporte");
const { atualizarStatusOuResponderTicket } = require("./funcs/atualizarStatusOuResponderTicket");
const { enviarNotificacaoWhatsApp } = require("./funcs/enviarNotificacaoWhatsApp"); // 🌟 ADICIONADO AQUI

// 2. Exportação de todas as Cloud Functions ativas para o Firebase

exports.atualizarEstatisticasVenda = atualizarEstatisticasVenda;
exports.prepararNovoLojista = prepararNovoLojista;
exports.reverterPlanosVencidos = reverterPlanosVencidos;
exports.verificarPagamentoLojistas = verificarPagamentoLojistas;
exports.contabilizarVendaPdvV2 = contabilizarVendaPdvV2;
exports.darBaixaEstoqueUniversal = darBaixaEstoqueUniversal;
exports.atualizarDevolucaoPedido = atualizarDevolucaoPedido;
exports.atualizarEstatisticasDespesasFixas = atualizarEstatisticasDespesasFixas;
exports.atualizarEstatisticasDespesasVariaveis = atualizarEstatisticasDespesasVariaveis;
exports.contabilizarFaturamentoAssinaturasMaster = contabilizarFaturamentoAssinaturasMaster;
exports.processarMasterDashboard = processarMasterDashboard;
exports.processarRankingProdutosClientes = processarRankingProdutosClientes;
exports.darBaixaEstoqueEmbalagemPedido = darBaixaEstoqueEmbalagemPedido; // 🌟 EXPORTADO AQUI
exports.criarTicketSuporte = criarTicketSuporte;
exports.atualizarStatusOuResponderTicket = atualizarStatusOuResponderTicket;
exports.enviarNotificacaoWhatsApp = enviarNotificacaoWhatsApp; // 🌟 EXPORTADO AQUI