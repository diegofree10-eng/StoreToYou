// app/layout.tsx
import { CartProvider } from "@/context/CartContext"; // Ou onde seu contexto estiver

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>
        {/* O Provider precisa envolver o {children} aqui no nível raiz */}
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}