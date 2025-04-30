// src/hooks/useContractEvents.ts
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export function useContractEvents(contract, eventName, callback) {
  const [events, setEvents] = useState([]);
  const [isListening, setIsListening] = useState(false);
  
  useEffect(() => {
    if (!contract || !eventName) return;
    
    setIsListening(true);
    
    // Set up event listener
    contract.on(eventName, (...args) => {
      const event = args[args.length - 1];
      console.log(`New ${eventName} event:`, event);
      
      setEvents(prev => [...prev, event]);
      
      if (callback && typeof callback === 'function') {
        callback(event);
      }
    });
    
    // Clean up
    return () => {
      if (contract && contract.listenerCount(eventName) > 0) {
        contract.removeAllListeners(eventName);
      }
      setIsListening(false);
    };
  }, [contract, eventName, callback]);
  
  return { events, isListening };
}