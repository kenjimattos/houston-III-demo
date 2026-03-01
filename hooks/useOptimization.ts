import { useCallback, useRef } from "react";

/**
 * Hook para debounce de funções - evita múltiplas execuções desnecessárias
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      // Limpa o timeout anterior se existir
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Define um novo timeout
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

/**
 * Hook para throttle de funções - limita a frequência de execução
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef<number>(0);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastRun.current >= delay) {
        lastRun.current = now;
        callback(...args);
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * Hook para prevenir duplo clique em ações críticas
 */
export function usePreventDoubleAction<
  T extends (...args: any[]) => Promise<any>
>(action: T, cooldownMs: number = 1000): [T, boolean] {
  const isExecuting = useRef(false);
  const lastExecution = useRef<number>(0);

  const wrappedAction = useCallback(
    (async (...args: Parameters<T>) => {
      const now = Date.now();

      // Verifica se ainda está executando ou em cooldown
      if (isExecuting.current || now - lastExecution.current < cooldownMs) {
        console.log("Ação ignorada - ainda em execução ou em cooldown");
        return;
      }

      isExecuting.current = true;
      lastExecution.current = now;

      try {
        return await action(...args);
      } finally {
        isExecuting.current = false;
      }
    }) as T,
    [action, cooldownMs]
  );

  return [wrappedAction, isExecuting.current];
}

export default { useDebounce, useThrottle, usePreventDoubleAction };
