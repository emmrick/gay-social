import { useState, useEffect, useCallback } from 'react';

type AppView = 'landing' | 'home' | 'swipe' | 'groups' | 'messages' | 'premium' | 'profile' | 'chat' | 'private' | 'support' | 'help' | 'chatbot-config';
type NavTab = 'home' | 'swipe' | 'messages' | 'premium' | 'help' | 'profile';

interface PersistedNavState {
  currentView: AppView;
  activeTab: NavTab;
  selectedRegion: string | null;
  selectedPrivateUserId: string | null;
}

const STORAGE_KEY = 'gc_nav_state';

const defaultState: PersistedNavState = {
  currentView: 'landing',
  activeTab: 'home',
  selectedRegion: null,
  selectedPrivateUserId: null,
};

export const usePersistedNavigation = (isAuthenticated: boolean, isLoading: boolean) => {
  // Initialize from sessionStorage (sessionStorage survives page reloads but not new tabs)
  const [state, setState] = useState<PersistedNavState>(() => {
    if (typeof window === 'undefined') return defaultState;
    
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as PersistedNavState;
      }
    } catch (e) {
      console.warn('Failed to parse nav state:', e);
    }
    return defaultState;
  });

  const [previousTab, setPreviousTab] = useState<NavTab>(state.activeTab);

  // Persist state changes to sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save nav state:', e);
    }
  }, [state]);

  // Handle auth state changes - only redirect TO home, never auto-reset to landing
  // (landing reset is handled explicitly via resetNavigation on sign-out)
  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      // If user is logged in and we're on landing, redirect to home
      if (state.currentView === 'landing') {
        setState(prev => ({
          ...prev,
          currentView: 'home',
        }));
      }
    }
    // NOTE: We intentionally do NOT reset to landing when isAuthenticated becomes false.
    // This prevents flickering during token refresh. resetNavigation() handles sign-out.
  }, [isAuthenticated, isLoading]);

  // Setters
  const setCurrentView = useCallback((view: AppView) => {
    setState(prev => ({ ...prev, currentView: view }));
  }, []);

  const setActiveTab = useCallback((tab: NavTab) => {
    setPreviousTab(state.activeTab);
    setState(prev => ({ ...prev, activeTab: tab }));
  }, [state.activeTab]);

  const setSelectedRegion = useCallback((region: string | null) => {
    setState(prev => ({ ...prev, selectedRegion: region }));
  }, []);

  const setSelectedPrivateUserId = useCallback((userId: string | null) => {
    setState(prev => ({ ...prev, selectedPrivateUserId: userId }));
  }, []);

  const resetNavigation = useCallback(() => {
    setState({
      currentView: 'landing',
      activeTab: 'home',
      selectedRegion: null,
      selectedPrivateUserId: null,
    });
  }, []);

  return {
    currentView: state.currentView,
    activeTab: state.activeTab,
    previousTab,
    selectedRegion: state.selectedRegion,
    selectedPrivateUserId: state.selectedPrivateUserId,
    setCurrentView,
    setActiveTab,
    setPreviousTab,
    setSelectedRegion,
    setSelectedPrivateUserId,
    resetNavigation,
  };
};
