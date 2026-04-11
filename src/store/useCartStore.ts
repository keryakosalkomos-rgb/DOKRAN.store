import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  product: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  size?: string;
  color?: string;
  maxStock?: number;
  customDesign?: {
    description: string;
    hexColors: string[];
    uploadedLogoUrl?: string | null;
    uploadedDesignUrl?: string | null;
    aiPreviewUrl?: string | null;
  };
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem, maxStock?: number) => void;
  removeItem: (productId: string, size?: string, color?: string) => void;
  updateQuantity: (productId: string, quantity: number, size?: string, color?: string, maxStock?: number) => void;
  clearCart: () => void;
  setItems: (items: CartItem[]) => void;
  cartTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, maxStock) => {
        const currentItems = get().items;
        const existingItem = currentItems.find(
          (i) => i.product === item.product && i.size === item.size && i.color === item.color
        );
        if (existingItem) {
          set({
            items: currentItems.map((i) => {
              if (i.product === item.product && i.size === item.size && i.color === item.color) {
                const newQty = i.quantity + item.quantity;
                return { ...i, quantity: maxStock !== undefined ? Math.min(newQty, maxStock) : newQty };
              }
              return i;
            }),
          });
        } else {
          const finalItem = maxStock !== undefined ? { ...item, quantity: Math.min(item.quantity, maxStock) } : item;
          set({ items: [...currentItems, finalItem] });
        }
      },
      removeItem: (productId, size, color) => {
        set({
          items: get().items.filter(
            (i) => !(i.product === productId && i.size === size && i.color === color)
          ),
        });
      },
      updateQuantity: (productId, quantity, size, color, maxStock) => {
        set({
          items: get().items.map((i) => {
            if (i.product === productId && i.size === size && i.color === color) {
              const newQty = Math.max(1, quantity);
              return { ...i, quantity: maxStock !== undefined ? Math.min(newQty, maxStock) : newQty };
            }
            return i;
          }),
        });
      },
      clearCart: () => set({ items: [] }),
      setItems: (items) => set({ items }),
      cartTotal: () => get().items.reduce((total, item) => total + item.price * item.quantity, 0),
    }),
    {
      name: "ds-cart-storage",
    }
  )
);
