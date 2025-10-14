<script lang="ts">
	import { getMsalContext } from '$lib/msalContext.js';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { InteractionRequiredAuthError } from '@azure/msal-browser';

	const msal = getMsalContext();
	let messages = $state<any[]>([]);
	let loading = $state(false);
	let error = $state('');
	let accessToken = $state('');
	let summaries = $state<Record<string, { summary: string; response: string; loading: boolean }>>({});

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

				// Generate summaries for each message
				for (const message of messages) {
					if (message.id) {
						generateSummaryAndResponse(message);
					}
				}
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

	async function generateSummaryAndResponse(message: any) {
		const messageId = message.id;
		summaries[messageId] = { summary: '', response: '', loading: true };

		const responsePrompt = [
			`Reply to the following email. Only generate the response to the email nothing else. Do not include any reasoning or thought`,
			`[email]`,
			`${message.body?.content || message.bodyPreview}`,
			`[/email]`
		].join('\n')

		try {
			const responseResponse = await fetch('http://localhost:11434/api/generate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: 'gemma3:1b-it-qat',
					prompt: responsePrompt,
					stream: false
				})
			});

			if (responseResponse.ok) {
				const responseData = await responseResponse.json();
				summaries[messageId].response = responseData.response;
			}
		} catch (err) {
			console.error('Error generating response:', err);
			summaries[messageId].response = 'Error generating response';
		} finally {
			summaries[messageId].loading = false;
			summaries = { ...summaries }; // Trigger reactivity
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
				<button onclick={fetchMessages}>Retry</button>
			{:else if messages.length > 0}
				<div style="max-height: 600px; overflow-y: auto; border: 1px solid #ccc; padding: 10px;">
					{#each messages as message (message.id)}
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
							{#if message.body?.content}
								<div style="margin: 10px 0; color: #555; font-size: 0.9em; border: 1px solid #ddd; padding: 10px; background: #f9f9f9;">
									{@html message.body.content}
								</div>
							{/if}

							{#if summaries[message.id]}
								<div style="margin-top: 10px; padding: 10px; background: #e8f4f8; border-left: 3px solid #0066cc;">
									{#if summaries[message.id].loading}
										<p style="margin: 0; color: #666;">Generating response...</p>
									{:else}
										<div>
											<strong>Suggested Response:</strong>
											<p style="margin: 5px 0 0 0; white-space: pre-wrap;">{summaries[message.id].response}</p>
										</div>
									{/if}
								</div>
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
			<button onclick={logout}>Logout</button>
		</div>
	</div>
{:else}
	<p>Not authenticated. Redirecting...</p>
{/if}
