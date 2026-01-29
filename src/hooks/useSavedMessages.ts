import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SavedMessage {
  id: string;
  content: string;
  createdAt: string;
}

export const useSavedMessages = () => {
  const { user } = useAuth();
  const [savedMessages, setSavedMessages] = useState<SavedMessage[]>([]);

  const storageKey = user ? `saved_messages_${user.id}` : null;

  // Load saved messages from localStorage
  useEffect(() => {
    if (!storageKey) {
      setSavedMessages([]);
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setSavedMessages(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading saved messages:', error);
      setSavedMessages([]);
    }
  }, [storageKey]);

  // Save to localStorage whenever messages change
  const persistMessages = useCallback((messages: SavedMessage[]) => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  }, [storageKey]);

  const addMessage = useCallback((content: string) => {
    if (!content.trim()) return;

    const newMessage: SavedMessage = {
      id: crypto.randomUUID(),
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    setSavedMessages((prev) => {
      const updated = [newMessage, ...prev];
      persistMessages(updated);
      return updated;
    });

    return newMessage;
  }, [persistMessages]);

  const deleteMessage = useCallback((id: string) => {
    setSavedMessages((prev) => {
      const updated = prev.filter((msg) => msg.id !== id);
      persistMessages(updated);
      return updated;
    });
  }, [persistMessages]);

  const updateMessage = useCallback((id: string, content: string) => {
    if (!content.trim()) return;

    setSavedMessages((prev) => {
      const updated = prev.map((msg) =>
        msg.id === id ? { ...msg, content: content.trim() } : msg
      );
      persistMessages(updated);
      return updated;
    });
  }, [persistMessages]);

  return {
    savedMessages,
    addMessage,
    deleteMessage,
    updateMessage,
  };
};
