import { writable } from 'svelte/store';
import { getContext, setContext } from 'svelte';

const AUTH_CONTEXT_KEY = 'auth';

// Create auth store
function createAuthStore() {
	const { subscribe, set, update } = writable({
		accessToken: '',
		refreshToken: '',
		tokenExpiry: null,
		isAuthenticated: false
	});

	return {
		subscribe,
		setTokens: (tokenData) => {
			const expiryTime = Date.now() + (tokenData.expires_in * 1000);
			const tokenExpiry = new Date(expiryTime);
			
			// Store in localStorage
			if (typeof window !== 'undefined') {
				localStorage.setItem('access_token', tokenData.access_token);
				if (tokenData.refresh_token) {
					localStorage.setItem('refresh_token', tokenData.refresh_token);
				}
				localStorage.setItem('token_expiry', expiryTime.toString());
			}
			
			set({
				accessToken: tokenData.access_token,
				refreshToken: tokenData.refresh_token || '',
				tokenExpiry,
				isAuthenticated: true
			});
		},
		loadStoredTokens: () => {
			if (typeof window !== 'undefined') {
				const storedAccessToken = localStorage.getItem('access_token');
				const storedRefreshToken = localStorage.getItem('refresh_token');
				const storedExpiry = localStorage.getItem('token_expiry');
				
				if (storedAccessToken && storedExpiry) {
					const expiryDate = new Date(parseInt(storedExpiry));
					if (expiryDate > new Date()) {
						set({
							accessToken: storedAccessToken,
							refreshToken: storedRefreshToken || '',
							tokenExpiry: expiryDate,
							isAuthenticated: true
						});
						return true;
					} else {
						// Token expired, clear storage
						localStorage.removeItem('access_token');
						localStorage.removeItem('refresh_token');
						localStorage.removeItem('token_expiry');
					}
				}
			}
			return false;
		},
		clearTokens: () => {
			if (typeof window !== 'undefined') {
				localStorage.removeItem('access_token');
				localStorage.removeItem('refresh_token');
				localStorage.removeItem('token_expiry');
			}
			set({
				accessToken: '',
				refreshToken: '',
				tokenExpiry: null,
				isAuthenticated: false
			});
		}
	};
}

export function setAuthContext() {
	const authStore = createAuthStore();
	setContext(AUTH_CONTEXT_KEY, authStore);
	return authStore;
}

export function getAuthContext() {
	return getContext(AUTH_CONTEXT_KEY);
}