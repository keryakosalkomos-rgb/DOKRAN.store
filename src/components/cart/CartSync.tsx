"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/store/useCartStore";

export default function CartSync() {
  const { status } = useSession();
  const items = useCartStore((state) => state.items);
  const firstRender = useRef(true);

  const hasMerged = useRef(false);

  useEffect(() => {
    // Attempt merging when user becomes authenticated
    if (status === "authenticated" && !hasMerged.current) {
      const mergeCarts = async () => {
        try {
          const res = await fetch("/api/user/cart");
          if (res.ok) {
            const { cart: remoteItems } = await res.json();
            if (remoteItems && remoteItems.length > 0) {
              const localItems = useCartStore.getState().items;
              
              // Simple Merge logic
              let merged = [...remoteItems];
              localItems.forEach((lItem) => {
                const existing = merged.find(
                  (r) => r.product === lItem.product && r.size === lItem.size && r.color === lItem.color
                );
                if (existing) {
                  existing.quantity += lItem.quantity;
                } else {
                  merged.push(lItem);
                }
              });

              // Update store and sync back to DB
              useCartStore.getState().setItems(merged);
              await fetch("/api/user/cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cart: merged }),
              });
            }
          }
          hasMerged.current = true;
        } catch (error) {
          console.error("Initial cart merge failed:", error);
        }
      };
      mergeCarts();
    }
  }, [status]);

  useEffect(() => {
    // Skip first render to avoid redundant sync on mount
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    // Only sync if logged in and merging is done (to avoid overwriting DB with empty local state before merge)
    if (status === "authenticated" && hasMerged.current) {
      const timer = setTimeout(async () => {
        try {
          await fetch("/api/user/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cart: items }),
          });
        } catch (error) {
          console.error("Auto-sync cart failed:", error);
        }
      }, 2000); // 2s debounce

      return () => clearTimeout(timer);
    }
  }, [items, status]);

  return null;
}
