// app/layout.tsx
import { CartProvider } from "@/context/CartContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <body>
        {/* O Provider precisa envolver o {children} aqui no nível raiz */}
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}