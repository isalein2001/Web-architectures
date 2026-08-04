export const FIRST_LAUNCH_ONBOARDING_STORAGE_KEY = 'nextRepsNativeFirstLaunchOnboardingV2';

const canUseStorage = () => typeof window !== 'undefined' && window.localStorage;

export const readFirstLaunchOnboardingDraft = () => {
  if (!canUseStorage()) return {};

  try {
    return JSON.parse(window.localStorage.getItem(FIRST_LAUNCH_ONBOARDING_STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
};

export const writeFirstLaunchOnboardingDraft = (draft) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(FIRST_LAUNCH_ONBOARDING_STORAGE_KEY, JSON.stringify(draft));
};

export const hasCompletedFirstLaunchOnboarding = () => (
  readFirstLaunchOnboardingDraft()?.completed === true
);
