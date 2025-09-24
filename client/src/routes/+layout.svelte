<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { setAuthContext } from '$lib/authContext.js';
	import { onMount } from 'svelte';

	let { children } = $props();

	// Set up auth context for the entire app
	const auth = setAuthContext();

	// Load stored tokens on app startup
	onMount(() => {
		auth.loadStoredTokens();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
