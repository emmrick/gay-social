/**
 * Hook centralisé pour gérer le tour d'onboarding plein écran.
 *
 * - Stockage : `localStorage[gc_onboarding_completed_v2_{userId}]`
 * - Migration v1 : si l'ancien flag `gc_onboarding_completed_{userId}` existe,
 *   on considère le tour comme déjà terminé (pas de relance auto).
 * - Relance externe : un autre composant peut déclencher l'ouverture en
 *   dispatchant `window.dispatchEvent(new Event('gc:open-onboarding'))` ou
 *   en appelant `openOnboardingTour()` (helper exporté).
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_PREFIX_V2 = 'gc_onboarding_completed_v2';
const STORAGE_PREFIX_V1 = 'gc_onboarding_completed';
export const ONBOARDING_OPEN_EVENT = 'gc:open-onboarding';

/** Helper utilisable depuis n'importe où (ex: chatbot, paramètres). */
export function openOnboardingTour() {
  try { window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT)); } catch { /* noop */ }
}

function buildKey(userId: string) {
  return `${STORAGE_PREFIX_V2}_${userId}`;
}

function readCompleted(userId: string): boolean {
  try {
    if (localStorage.getItem(buildKey(userId)) === 'true') return true;
    // Migration v1 → v2 : si l'ancien flag existe, considérer terminé.
    if (localStorage.getItem(`${STORAGE_PREFIX_V1}_${userId}`)) {
      localStorage.setItem(buildKey(userId), 'true');
      return true;
    }
  } catch { /* noop */ }
  return false;
}

export function useOnboarding() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Sync `hasCompleted` à la connexion / changement d'utilisateur.
  useEffect(() => {
    if (!user?.id) {
      setHasCompleted(false);
      return;
    }
    setHasCompleted(readCompleted(user.id));
  }, [user?.id]);

  // Auto-ouverture pour un nouvel utilisateur (1ʳᵉ connexion).
  useEffect(() => {
    if (!user?.id) return;
    if (hasCompleted) return;
    // Petit délai pour laisser passer les autres modales (PromoPopup, AgeConf…)
    const t = setTimeout(() => setIsOpen(true), 1800);
    return () => clearTimeout(t);
  }, [user?.id, hasCompleted]);

  // Listener pour la relance externe (chatbot / paramètres / autre).
  useEffect(() => {
    const handler = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };
    window.addEventListener(ONBOARDING_OPEN_EVENT, handler);
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, handler);
  }, []);

  const open = useCallback(() => {
    setCurrentStep(0);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const complete = useCallback(() => {
    if (user?.id) {
      try { localStorage.setItem(buildKey(user.id), 'true'); } catch { /* noop */ }
    }
    setHasCompleted(true);
    setIsOpen(false);
  }, [user?.id]);

  const goToStep = useCallback((n: number) => setCurrentStep(n), []);

  const reset = useCallback(() => {
    if (user?.id) {
      try {
        localStorage.removeItem(buildKey(user.id));
        localStorage.removeItem(`${STORAGE_PREFIX_V1}_${user.id}`);
      } catch { /* noop */ }
    }
    setHasCompleted(false);
  }, [user?.id]);

  return {
    isOpen,
    hasCompleted,
    currentStep,
    open,
    close,
    complete,
    goToStep,
    reset,
  };
}
