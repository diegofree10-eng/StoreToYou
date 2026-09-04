// context/CartContext.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { useParams } from "next/navigation";
import { Produto } from "@/types";

interface CartContextType {
  cart: Produto[];
  addToCart: (product: any) => void;
  removeFromCart: (cartItemKey: string) => void;
  setItemQty: (cartItemKey: string, qty: number) => void;
  clearCart: () => void;
  subtotal: number;
  totalItens: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_VERSION = 3;

function normalizeParam(value: string | string[] | undefined): string | undefined { 
  return Array.isArray(value) ? value[0] : value; 
}

function normalizeText(value: string | any): string { 
  return typeof value === "string" ? value.trim() : ""; 
}

function parsePreco(preco: string | number): number {
  if (typeof preco === "number") return Number.isFinite(preco) ? preco : 0;
  if (typeof preco !== "string") return 0;
  const cleaned = preco.trim().replace(/[R$\u00A0\s]/g, "").replace(/\./g, "").replace(",", ".");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function safeNumber(value: any, fallback: number = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeAdicionais(adicionais: any[]): any[] {
  if (!Array.isArray(adicionais)) return [];
  return adicionais.map((item) => ({
    id: String(item?.id ?? item?.nome ?? ""),
    nome: item?.nome || "",
    preco: parsePreco(item?.preco),
    qty: Math.max(1, safeNumber(item?.qty, 1)),
  })).filter((item) => item.id !== "" || item.nome !== "").sort((a, b) => a.id.localeCompare(b.id));
}

function buildCartItemKey(item: any): string {
  const id = String(item?.id ?? "");
  const variacao = item?.isTemVariacoesProduto === true ? (item?.variacao || item?.dsVariacaoProduto || "") : "";
  const ads = normalizeAdicionais(item?.adicionais).map((a: any) => `${a.id}|${a.qty}`).join(",");
  return `${id}::${variacao}::${ads}`;
}

function normalizeCartItem(item: any) {
  const nomeBruto = item?.dsNomeProduto || item?.nome || "";
  const nomeLimpo = typeof nomeBruto === "string" && nomeBruto.trim() !== "" ? nomeBruto : "Produto sem nome";
  
  const precoBruto = item?.vlPrecoProduto ?? item?.vlPrecoBasicoProduto ?? item?.preco ?? 0;
  const capaBruta = item?.dsFotoProduto || item?.dsCapaProduto || item?.capa || (item?.dsImagensProduto?.[0]) || "";
  const skuBruto = item?.dsSkuProduto || item?.sku || "SEM-SKU";
  const diasProdBruto = item?.nrDiasProducaoProduto ?? item?.nrDiasProducao ?? 0;

  // Regra rígida: Se o produto não tem variações, a variação é estritamente vazia (""). 
  // Se tem variações, pega exatamente o valor informado na seleção do produto.
  const temVariacoes = item?.isTemVariacoesProduto === true || item?.isTemVariacoes === true;
  const variacaoFinal = temVariacoes ? (item?.variacao || item?.dsVariacaoProduto || "") : "";

  const normalized = {
    ...item,
    id: String(item?.id || item?.idProduto || ""),
    sku: skuBruto,
    nome: nomeLimpo,
    dsNomeProduto: nomeLimpo,
    capa: capaBruta,
    preco: parsePreco(precoBruto),
    isTemVariacoesProduto: temVariacoes,
    variacao: variacaoFinal,
    dsVariacaoProduto: variacaoFinal,
    qty: Math.max(1, safeNumber(item?.qty ?? item?.quantidade, 1)),
    adicionais: normalizeAdicionais(item?.adicionais),
    observacao: normalizeText(item?.observacao),
    precisaFrete: item?.isPrecisaFreteProduto ?? item?.precisaFrete ?? true,
    envioTransportadora: !!(item?.isEnvioTransportadora ?? item?.envioTransportadora),
    permiteRetirada: !!(item?.isPermiteRetirada ?? item?.permiteRetirada),
    peso: item?.nrPesoProduto ?? item?.peso ?? 0.2,
    nrDiasProducao: safeNumber(diasProdBruto, 0),
  };
  return { ...normalized, cartItemKey: item.cartItemKey || buildCartItemKey(normalized) };
}

function validateAndMergeCart(items: any[]) { 
  if (!Array.isArray(items)) return [];
  const map = new Map<string, any>();
  for (const rawItem of items) {
    if (!rawItem) continue;
    const item = normalizeCartItem(rawItem);
    const key = item.cartItemKey;
    if (map.has(key)) {
      const existing = map.get(key);
      map.set(key, { ...existing, qty: existing.qty + item.qty, observacao: existing.observacao || item.observacao });
    } else { 
      map.set(key, item); 
    }
  }
  return Array.from(map.values());
}

function cartReducer(state: any, action: any) {
  switch (action.type) {
    case "LOAD_CART": return { ...state, cart: validateAndMergeCart(action.payload) };
    case "ADD_ITEM": {
      const incoming = normalizeCartItem(action.payload);
      const existingIndex = state.cart.findIndex((i: any) => i.cartItemKey === incoming.cartItemKey);
      if (existingIndex >= 0) {
        const updated = [...state.cart];
        updated[existingIndex] = { ...updated[existingIndex], qty: updated[existingIndex].qty + incoming.qty };
        return { ...state, cart: updated };
      }
      return { ...state, cart: [...state.cart, incoming] };
    }
    case "REMOVE_ITEM": return { ...state, cart: state.cart.filter((i: any) => i.cartItemKey !== action.payload.cartItemKey) };
    case "SET_ITEM_QTY":
      const newQty = safeNumber(action.payload.qty);
      if (newQty <= 0) return { ...state, cart: state.cart.filter((i: any) => i.cartItemKey !== action.payload.cartItemKey) };
      return { ...state, cart: state.cart.map((i: any) => i.cartItemKey === action.payload.cartItemKey ? { ...i, qty: newQty } : i) };
    case "CLEAR_CART": return { ...state, cart: [] };
    default: return state;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const [state, dispatch] = useReducer(cartReducer, { cart: [] });
  const [isMounted, setIsMounted] = useState(false);

  const lojistaSlug = normalizeParam(params?.lojista) || normalizeParam(params?.slug);
  const storageKey = `carrinho_${lojistaSlug || "geral"}`;

  useEffect(() => {
    setIsMounted(true);
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed) ? parsed : (parsed?.items || []);
        dispatch({ type: "LOAD_CART", payload: items });
      } catch (e) { localStorage.removeItem(storageKey); }
    }
  }, [storageKey]);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem(storageKey, JSON.stringify({
      version: CART_STORAGE_VERSION,
      items: state.cart,
      updatedAt: Date.now()
    }));
  }, [state.cart, storageKey, isMounted]);

  const addToCart = useCallback((product: any) => dispatch({ type: "ADD_ITEM", payload: product }), []);
  const removeFromCart = useCallback((cartItemKey: string) => dispatch({ type: "REMOVE_ITEM", payload: { cartItemKey } }), []);
  const setItemQty = useCallback((cartItemKey: string, qty: number) => dispatch({ type: "SET_ITEM_QTY", payload: { cartItemKey, qty } }), []);
  const clearCart = useCallback(() => dispatch({ type: "CLEAR_CART" }), []);

  const value = useMemo(() => ({
    cart: state.cart,
    addToCart,
    removeFromCart,
    setItemQty,
    clearCart,
    subtotal: state.cart.reduce((s: number, i: any) => s + (parsePreco(i.preco) * i.qty), 0),
    totalItens: state.cart.reduce((s: number, i: any) => s + i.qty, 0)
  }), [state.cart, addToCart, removeFromCart, setItemQty, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart deve ser usado dentro de um CartProvider");
  return context;
};