import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Persistência local (no MVP do documento: chave própria por usuária/e-mail).
export function usePersistent<T>(key: string, initial: T) {
  const [val, setVal] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(key).then(s => { if (s) setVal(JSON.parse(s)); setReady(true); });
  }, [key]);
  useEffect(() => { if (ready) AsyncStorage.setItem(key, JSON.stringify(val)); }, [val, ready, key]);
  return [val, setVal] as const;
}
