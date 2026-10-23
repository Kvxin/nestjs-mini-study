import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '../api';
import type { UserProfile } from '../types';

const USER_KEY = 'authUser';
const TOKEN_KEY = 'accessToken';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserProfile | null>(null);
  const accessToken = ref<string | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => Boolean(accessToken.value));
  const isAdmin = computed(() => user.value?.role === 'ADMIN');

  function hydrate() {
    const userRaw = localStorage.getItem(USER_KEY);
    const tokenRaw = localStorage.getItem(TOKEN_KEY);
    user.value = userRaw ? (JSON.parse(userRaw) as UserProfile) : null;
    accessToken.value = tokenRaw;
  }

  function persist() {
    if (user.value) localStorage.setItem(USER_KEY, JSON.stringify(user.value));
    else localStorage.removeItem(USER_KEY);

    if (accessToken.value) localStorage.setItem(TOKEN_KEY, accessToken.value);
    else localStorage.removeItem(TOKEN_KEY);
  }

  async function login(email: string, password: string) {
    loading.value = true;
    try {
      const result = await api.login({ email, password, deviceInfo: navigator.userAgent });
      user.value = result.user;
      accessToken.value = result.accessToken;
      persist();
    } finally {
      loading.value = false;
    }
  }

  async function register(email: string, password: string) {
    loading.value = true;
    try {
      const result = await api.register({ email, password, deviceInfo: navigator.userAgent });
      user.value = result.user;
      accessToken.value = result.accessToken;
      persist();
    } finally {
      loading.value = false;
    }
  }

  async function refreshByCookie() {
    try {
      const result = await api.refresh();
      user.value = result.user;
      accessToken.value = result.accessToken;
      persist();
      return true;
    } catch {
      clear();
      return false;
    }
  }

  async function fetchMe() {
    if (!accessToken.value) return;
    const profile = await api.me();
    user.value = profile;
    persist();
  }

  async function logout() {
    try {
      await api.logout();
    } finally {
      clear();
    }
  }

  function clear() {
    user.value = null;
    accessToken.value = null;
    persist();
  }

  return {
    user,
    accessToken,
    loading,
    isAuthenticated,
    isAdmin,
    hydrate,
    login,
    register,
    refreshByCookie,
    fetchMe,
    logout,
    clear,
  };
});
