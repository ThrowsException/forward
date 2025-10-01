<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { getAuthContext } from '$lib/authContext.js';
	import { getMsalContext } from '$lib/msalContext.js';
	import { InteractionRequiredAuthError } from '@azure/msal-browser';
	import { redirect } from '@sveltejs/kit';

	const auth = getAuthContext();
	const msal = getMsalContext();
	let authStatus = 'Not authenticated';
	let codeVerifier = '';

	// Check for successful login redirect or existing MSAL token on page load
	$: if (browser && $msal.isInitialized) {
		// Check if user just returned from Microsoft login
		if ($msal.redirectResult?.account) {
			console.log('Login successful, redirecting to subscription page');
			goto('/subscription');
		} else if ($msal.pca && $msal.accountId) {
			// Check for existing valid token
			const currentAcc = $msal.pca.getAccountByHomeId($msal.accountId);
			if (currentAcc) {
				const tokenRequest = {
					scopes: ['user.read'],
					account: currentAcc
				};
				$msal.pca.acquireTokenSilent(tokenRequest)
					.then((response) => {
						if (response?.accessToken) {
							goto('/subscription');
						}
					})
					.catch((error) => {
						console.log('No valid token found:', error);
					});
			}
		}
	}

	// Subscribe to auth state changes and redirect if authenticated
	$: if ($auth.isAuthenticated && browser) {
		// Check if we're not already in the middle of OAuth flow
		const urlParams = new URLSearchParams(window.location.search);
		console.log(window.location.search);
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

	async function generateCodeChallenge(verifier: string) {
		const encoder = new TextEncoder();
		const data = encoder.encode(verifier);
		const digest = await crypto.subtle.digest('SHA-256', data);
		return btoa(String.fromCharCode(...new Uint8Array(digest)))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=/g, '');
	}

	// Generate random state parameter for OAuth security
	function generateState() {
		const array = new Uint8Array(16);
		crypto.getRandomValues(array);
		return btoa(String.fromCharCode(...array))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=/g, '');
	}


	async function exchangeCodeForToken(code: string) {
		authStatus = 'Exchanging code for token...';

		// email-reader
		// const tenant = 'b91098dd-a998-44c7-80fc-e70c0a9672ed';
		// const clientId = '9e556ddc-fd02-427e-a268-2bde7564f03b';

		// again-please
		const tenant = 'b91098dd-a998-44c7-80fc-e70c0a9672ed';
		const clientId = '3ff5c003-b4ee-440b-b873-fd268cb1ae43';
		const redirectUri = 'http://localhost:5173/';

		// const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
		const tokenUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/token`;


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
			authStatus = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
			console.error('Token exchange error:', error);
		}
	}

	async function handleClick() {
		// Generate PKCE parameters
		codeVerifier = generateCodeVerifier();
		const codeChallenge = await generateCodeChallenge(codeVerifier);

		// Generate random state parameter
		const state = generateState();

		// Store code verifier and state in sessionStorage for later use
		sessionStorage.setItem('code_verifier', codeVerifier);
		sessionStorage.setItem('oauth_state', state);

		// email-reader
		// const tenant = 'b91098dd-a998-44c7-80fc-e70c0a9672ed';
		// const clientId = '9e556ddc-fd02-427e-a268-2bde7564f03b';

		// again-please
		const tenant = 'b91098dd-a998-44c7-80fc-e70c0a9672ed';
		const clientId = '3ff5c003-b4ee-440b-b873-fd268cb1ae43';
		const redirectUri = encodeURIComponent('http://localhost:5173/');
		const scope = encodeURIComponent('openid email profile mail.read user.read');
		console.log(scope);

		const authUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scope}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256&prompt=consent`;

		window.location.href = authUrl;
	}

	async function pcaClick() {
		if (!$msal.pca) return;

		var loginRequest = {
			scopes: ['user.read', 'mail.send', 'mail.read']
		};

		await $msal.pca.loginRedirect(loginRequest);
	}

	async function getTokenPopup(request, account) {
		if (!$msal.pca) return;

		request.account = account;
		return await $msal.pca.acquireTokenSilent(request).catch(async (error) => {
			console.log('silent token acquisition fails.');
			if (error instanceof InteractionRequiredAuthError) {
				console.log('acquiring token using popup');
				return $msal.pca.acquireTokenPopup(request).catch((error) => {
					console.error(error);
				});
			} else {
				console.error(error);
			}
		});
	}

	// Helper function to call MS Graph API endpoint
	// using authorization bearer token scheme
	function callMSGraph(endpoint, accessToken) {
		const headers = new Headers();
		const bearer = `Bearer ${accessToken}`;

		headers.append('Authorization', bearer);

		const options = {
			method: 'GET',
			headers: headers
		};

		console.log('request made to Graph API at: ' + new Date().toString());

		fetch(endpoint, options)
			.then((response) => response.json())
			.catch((error) => console.log(error));
	}

	async function readMail() {
		if (!$msal.pca || !$msal.accountId) return;

		// Add here scopes for access token to be used at MS Graph API endpoints.
		const tokenRequest = {
			scopes: ['Mail.Read'],
			forceRefresh: true // Set this to "true" to skip a cached token and go to the server to get a new token
		};
		const currentAcc = $msal.pca.getAccountByHomeId($msal.accountId);
		console.log(currentAcc);
		if (currentAcc) {
			const response = await getTokenPopup(tokenRequest, currentAcc).catch((error) => {
				console.log(error);
			});
			callMSGraph('https://graph.microsoft.com/v1.0/me/messages', response?.accessToken);
		}
	}
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<div>
	<p>Status: {authStatus}</p>
	<button on:click={pcaClick}>Login with Microsoft</button>
	<!-- <button on:click={handleClick}>Login with Microsoft</button> -->
	<button on:click={readMail}>Read Mail For User</button>
</div>
