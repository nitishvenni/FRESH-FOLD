import { useCallback, useEffect, useState } from "react";
import { getOrders, OrderRecord } from "../services/orderService";

export default function useOrders(autoLoad = true) {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const nextOrders = await getOrders();
      setOrders(nextOrders);
      return nextOrders;
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error("Failed to load orders");
      setError(normalized);
      throw normalized;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    void refresh();
  }, [autoLoad, refresh]);

  return {
    orders,
    loading,
    error,
    refresh,
    setOrders,
  };
}
