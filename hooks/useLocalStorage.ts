
import React, { useState } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return initialValue;
      
      try {
          // Attempt to parse JSON. If it's a naked string, parse will fail.
          return JSON.parse(item);
      } catch {
          // If JSON parse fails, return the raw string (for simple string values)
          return item as unknown as T;
      }
    } catch (error) {
      console.warn(`useLocalStorage: Error reading key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Update local state first
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
          let stringifiedValue: string;
          
          if (typeof valueToStore === 'string') {
              // Store naked string directly to avoid double quoting "string" -> ""string""
              stringifiedValue = valueToStore;
          } else {
              try {
                  stringifiedValue = JSON.stringify(valueToStore);
              } catch (stringifyError) {
                  // If stringify fails (e.g. circular structure), log error and don't persist
                  console.error(`useLocalStorage: Attempted to save non-serializable object to "${key}".`, stringifyError);
                  return;
              }
          }
          
          window.localStorage.setItem(key, stringifiedValue);
      }
    } catch (error) {
      console.error(`useLocalStorage: Error setting key "${key}":`, error);
    }
  };
  
  return [storedValue, setValue];
}

export default useLocalStorage;
