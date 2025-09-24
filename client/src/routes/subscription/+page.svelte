<script>
	import { getAuthContext } from '$lib/authContext.js';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	const auth = getAuthContext();

	onMount(() => {
		// Redirect to home if not authenticated
		if (!$auth.isAuthenticated) {
			goto('/');
		}
	});
</script>

<h1>Subscription</h1>

{#if $auth.isAuthenticated}
	<div>
		<p>Welcome! You are now authenticated.</p>
		<p>Token expires: {$auth.tokenExpiry ? $auth.tokenExpiry.toLocaleString() : 'Unknown'}</p>
		
		<div style="margin-top: 20px;">
			<h2>Next Steps</h2>
			<p>Configure your subscription settings here.</p>
		</div>

		<button on:click={() => auth.clearTokens()}>Logout</button>
	</div>
{:else}
	<p>Not authenticated. Redirecting...</p>
{/if}