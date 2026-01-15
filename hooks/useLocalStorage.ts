
import React, { useState, useEffect } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;
      
      // Simple types don't need JSON parse if they are already strings/numbers
      try {
          return JSON.parse(item);
      } catch {
          return item as unknown as T;
      }
    } catch (error) {
      console.warn(`useLocalStorage: Error reading key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Prevent saving circular structures or complex DOM/Firebase objects
      if (typeof valueToStore === 'object' && valueToStore !== null) {
          try {
              // Quick test to see if it's serializable
              JSON.stringify(valueToStore);
          } catch (e) {
              console.error(`useLocalStorage: Attempted to save non-serializable object to "${key}". Operation cancelled to prevent crash.`, e);
              return;
          }
      }

      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
          const stringifiedValue = typeof valueToStore === 'string' ? valueToStore : JSON.stringify(valueToStore);
          window.localStorage.setItem(key, stringifiedValue);
      }
    } catch (error) {
      console.error(`useLocalStorage: Error setting key "${key}":`, error);
    }
  };
  
  return [storedValue, setValue];
}

export default useLocalStorage;
