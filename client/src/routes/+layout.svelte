<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { setAuthContext } from '$lib/authContext.js';
	import { setMsalContext } from '$lib/msalContext.js';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { children } = $props();

	// Set up auth context for the entire app
	const auth = setAuthContext();
	const msal = setMsalContext();

	// Load stored tokens and initialize MSAL on app startup
	onMount(() => {
		auth.loadStoredTokens();
		if (browser) {
			msal.initialize();
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
