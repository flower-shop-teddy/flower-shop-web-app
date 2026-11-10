import { useLocalStorage } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Money } from '@/shared/api/types';

/**
 * Giỏ hàng lưu ở localStorage để không mất khi F5. Chỉ chứa dữ liệu công khai (sku, tên, giá niêm yết);
 * giá trong giỏ chỉ để hiển thị "tạm tính" - khi đặt đơn server tự lấy giá, request không gửi giá.
 */
export interface CartLine {
  flowerId: number;
  sku: string;
  name: string;
  category: string;
  unitPrice: Money;
  currency: string;
  quantity: number;
}

export const MAX_LINES = 20; // PlaceOrderRequest.items tối đa 20 dòng
export const MAX_QTY = 99; // mỗi dòng 1–99

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  currency: string;
  opened: boolean;
  open: () => void;
  close: () => void;
  add: (line: Omit<CartLine, 'quantity'>, quantity?: number) => void;
  setQuantity: (sku: string, quantity: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const clampQty = (q: number) => Math.min(MAX_QTY, Math.max(1, Math.floor(q) || 1));

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useLocalStorage<CartLine[]>({
    key: 'fs.cart',
    defaultValue: [],
    getInitialValueInEffect: false,
  });
  const [opened, setOpened] = useState(false);

  const add = useCallback<CartContextValue['add']>(
    (line, quantity = 1) => {
      setLines((prev) => {
        const found = prev.find((l) => l.sku === line.sku);
        if (found)
          return prev.map((l) =>
            l.sku === line.sku ? { ...l, ...line, quantity: clampQty(l.quantity + quantity) } : l,
          );
        if (prev.length >= MAX_LINES) {
          notifications.show({ color: 'yellow', message: `Mỗi đơn tối đa ${MAX_LINES} loại hoa.` });
          return prev;
        }
        return [...prev, { ...line, quantity: clampQty(quantity) }];
      });
      notifications.show({ color: 'pink', message: `Đã thêm ${line.name} vào giỏ`, autoClose: 2000 });
    },
    [setLines],
  );

  const value = useMemo<CartContextValue>(() => {
    const safe = Array.isArray(lines) ? lines : [];
    return {
      lines: safe,
      count: safe.reduce((s, l) => s + l.quantity, 0),
      subtotal: safe.reduce((s, l) => s + Number(l.unitPrice) * l.quantity, 0),
      currency: safe[0]?.currency ?? 'VND',
      opened,
      open: () => setOpened(true),
      close: () => setOpened(false),
      add,
      setQuantity: (sku, q) =>
        setLines((prev) => prev.map((l) => (l.sku === sku ? { ...l, quantity: clampQty(q) } : l))),
      remove: (sku) => setLines((prev) => prev.filter((l) => l.sku !== sku)),
      clear: () => setLines([]),
    };
  }, [lines, opened, add, setLines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart phải nằm trong CartProvider');
  return ctx;
}
