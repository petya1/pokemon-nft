// src/components/EventNotifications.tsx
'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Context';

type Notification = {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error';
  timestamp: Date;
};

export default function EventNotifications() {
  const { nftContract, marketplaceContract } = useWeb3();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Function to add a notification
  const addNotification = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, timestamp: new Date() }]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(note => note.id !== id));
    }, 5000);
  };

  useEffect(() => {
    // Only add a welcome notification for now
    // This avoids all the event binding errors
    addNotification('Connected to blockchain. Event notifications are simplified for compatibility.', 'info');
    
    return () => {
      // No cleanup needed since we're not binding to events
    };
  }, [nftContract, marketplaceContract]);
  
  if (notifications.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse space-y-reverse space-y-2 max-w-md">
      {notifications.map(note => (
        <div 
          key={note.id}
          className={`p-3 rounded-lg shadow-md transition-all duration-300 ${
            note.type === 'success' ? 'bg-green-100 text-green-800 border-l-4 border-green-500' :
            note.type === 'error' ? 'bg-red-100 text-red-800 border-l-4 border-red-500' :
            'bg-blue-100 text-blue-800 border-l-4 border-blue-500'
          }`}
        >
          <div className="flex justify-between items-start">
            <p>{note.message}</p>
            <button 
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== note.id))}
              className="text-gray-500 hover:text-gray-700 ml-2"
            >
              ×
            </button>
          </div>
          <p className="text-xs mt-1 opacity-75">
            {note.timestamp.toLocaleTimeString()}
          </p>
        </div>
      ))}
    </div>
  );
}