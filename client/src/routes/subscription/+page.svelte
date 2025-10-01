<script lang="ts">
	import { getMsalContext } from '$lib/msalContext.js';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { InteractionRequiredAuthError } from '@azure/msal-browser';

	const msal = getMsalContext();
	let messages: any[] = [];
	let loading = false;
	let error = '';
	let accessToken = '';

	onMount(async () => {
		// Redirect to home if not authenticated
		if (!$msal.isInitialized || !$msal.pca || !$msal.accountId) {
			goto('/');
			return;
		}

		// Get access token
		await getAccessToken();
		if (accessToken) {
			fetchMessages();
		}
	});

	async function getAccessToken() {
		if (!$msal.pca || !$msal.accountId) return;

		const currentAcc = $msal.pca.getAccountByHomeId($msal.accountId);
		if (!currentAcc) {
			goto('/');
			return;
		}

		const tokenRequest = {
			scopes: ['user.read', 'mail.read'],
			account: currentAcc
		};

		try {
			const response = await $msal.pca.acquireTokenSilent(tokenRequest);
			accessToken = response.accessToken;
		} catch (err) {
			if (err instanceof InteractionRequiredAuthError) {
				// Require user interaction - redirect to login
				await $msal.pca.acquireTokenRedirect(tokenRequest);
			} else {
				console.error('Token acquisition error:', err);
				goto('/');
			}
		}
	}

	async function fetchMessages() {
		loading = true;
		error = '';

		console.log('Access token available:', !!accessToken);
		console.log('Token length:', accessToken?.length);

		try {
			const response = await fetch('https://graph.microsoft.com/v1.0/me/messages', {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json'
				}
			});

			console.log('Response status:', response.status);
			console.log('Response headers:', Object.fromEntries(response.headers.entries()));

			if (response.ok) {
				const data = await response.json();
				messages = data.value || [];
			} else {
				const errorText = await response.text();
				console.log('Error response body:', errorText);
				error = `Failed to fetch messages: ${response.status} ${errorText}`;

				// If 401, try to get more specific error info
				if (response.status === 401) {
					error += ' - Check if the access token is valid and has proper mail.read permissions';
				}
			}
		} catch (err) {
			error = `Error fetching messages: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			loading = false;
		}
	}

	async function logout() {
		if (!$msal.pca) return;

		const currentAcc = $msal.pca.getAccountByHomeId($msal.accountId);
		if (currentAcc) {
			await $msal.pca.logoutRedirect({ account: currentAcc });
		}
	}
</script>

<h1>Subscription</h1>

{#if $msal.isInitialized && $msal.accountId}
	<div>
		<p>Welcome! You are now authenticated.</p>

		<div style="margin-top: 20px;">
			<h2>Your Messages</h2>

			{#if loading}
				<p>Loading messages...</p>
			{:else if error}
				<p style="color: red;">{error}</p>
				<button on:click={fetchMessages}>Retry</button>
			{:else if messages.length > 0}
				<div style="max-height: 600px; overflow-y: auto; border: 1px solid #ccc; padding: 10px;">
					{#each messages as message}
						<div style="border-bottom: 1px solid #eee; padding: 10px 0;">
							<h4 style="margin: 0 0 5px 0;">{message.subject || '(No Subject)'}</h4>
							<p style="margin: 0 0 5px 0; color: #666; font-size: 0.9em;">
								From: {message.from?.emailAddress?.name ||
									message.from?.emailAddress?.address ||
									'Unknown'}
							</p>
							<p style="margin: 0 0 5px 0; color: #888; font-size: 0.8em;">
								Received: {new Date(message.receivedDateTime).toLocaleString()}
							</p>
							{#if message.bodyPreview}
								<p style="margin: 0; color: #555; font-size: 0.9em;">
									{message.bodyPreview.substring(0, 200)}{message.bodyPreview.length > 200
										? '...'
										: ''}
								</p>
							{/if}
						</div>
					{/each}
				</div>
				<p style="margin-top: 10px; color: #666;">Showing {messages.length} messages</p>
			{:else}
				<p>No messages found.</p>
			{/if}
		</div>

		<div style="margin-top: 30px;">
			<button on:click={logout}>Logout</button>
		</div>
	</div>
{:else}
	<p>Not authenticated. Redirecting...</p>
{/if}
