<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { getAuthContext } from '$lib/authContext.js';

	const auth = getAuthContext();
	let authStatus = 'Not authenticated';
	let codeVerifier = '';

	// Subscribe to auth state changes and redirect if authenticated
	$: if ($auth.isAuthenticated && browser) {
		// Check if we're not already in the middle of OAuth flow
		const urlParams = new URLSearchParams(window.location.search);
		const code = urlParams.get('code');
		
		if (!code) {
			goto('/subscription');
		}
	}

	// Update status display
	$: if ($auth.isAuthenticated) {
		authStatus = `Authenticated! Access token: ${$auth.accessToken.substring(0, 20)}...`;
	} else {
		authStatus = 'Not authenticated';
	}

	// Generate PKCE code verifier and challenge
	function generateCodeVerifier() {
		const array = new Uint8Array(32);
		crypto.getRandomValues(array);
		return btoa(String.fromCharCode(...array))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=/g, '');
	}

	async function generateCodeChallenge(verifier) {
		const encoder = new TextEncoder();
		const data = encoder.encode(verifier);
		const digest = await crypto.subtle.digest('SHA-256', data);
		return btoa(String.fromCharCode(...new Uint8Array(digest)))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=/g, '');
	}

	onMount(() => {
		if (browser) {
			const urlParams = new URLSearchParams(window.location.search);
			const code = urlParams.get('code');
			const state = urlParams.get('state');

			if (code && state === '12345') {
				exchangeCodeForToken(code);
			}
		}
	});

	async function exchangeCodeForToken(code) {
		authStatus = 'Exchanging code for token...';

		const tenant = 'b91098dd-a998-44c7-80fc-e70c0a9672ed';
		const clientId = '9e556ddc-fd02-427e-a268-2bde7564f03b';
		const redirectUri = 'http://localhost:5173/';

		const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

		// Get the stored code verifier from sessionStorage
		const storedCodeVerifier = sessionStorage.getItem('code_verifier');
		if (!storedCodeVerifier) {
			authStatus = 'Error: No code verifier found';
			return;
		}

		const body = new URLSearchParams({
			client_id: clientId,
			code: code,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code',
			code_verifier: storedCodeVerifier
		});

		try {
			const response = await fetch(tokenUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: body
			});

			if (response.ok) {
				const tokenData = await response.json();
				// Store tokens in context
				auth.setTokens(tokenData);
				console.log('Token data:', tokenData);
				// Clear the URL params and redirect to subscription page
				window.history.replaceState({}, document.title, window.location.pathname);
				window.location.href = '/subscription';
			} else {
				const error = await response.text();
				authStatus = `Error: ${error}`;
				console.error('Token exchange error:', error);
			}
		} catch (error) {
			authStatus = `Error: ${error.message}`;
			console.error('Token exchange error:', error);
		}
	}

	async function handleClick() {
		// Generate PKCE parameters
		codeVerifier = generateCodeVerifier();
		const codeChallenge = await generateCodeChallenge(codeVerifier);
		
		// Store code verifier in sessionStorage for later use
		sessionStorage.setItem('code_verifier', codeVerifier);

		const tenant = 'b91098dd-a998-44c7-80fc-e70c0a9672ed';
		const clientId = '9e556ddc-fd02-427e-a268-2bde7564f03b';
		const redirectUri = encodeURIComponent('http://localhost:5173/');
		const scope = encodeURIComponent('offline_access user.read mail.read');
		const state = '12345';

		const authUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scope}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

		window.location.href = authUrl;
	}
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<div>
	<p>Status: {authStatus}</p>
	<button on:click={handleClick}>Login with Microsoft</button>
</div>
