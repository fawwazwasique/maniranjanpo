
import React, { useState, useEffect } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(errorMessage);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to local storage
      if (typeof window !== 'undefined') {
        // Defensive check: Ensure we don't crash on circular objects (like Events)
        try {
            const jsonValue = JSON.stringify(valueToStore);
            window.localStorage.setItem(key, jsonValue);
        } catch (serializationError) {
            console.warn(`useLocalStorage: Could not serialize value for key "${key}". It might contain circular references or be an Event object.`, serializationError);
        }
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(errorMessage);
    }
  };
  
  return [storedValue, setValue];
}

export default useLocalStorage;
