<script lang="ts">
	import { browser } from '$app/environment';
	import { faLock } from '@fortawesome/free-solid-svg-icons';
	import { signInModalActive } from 'src/store/modal';
	import { onMount } from 'svelte';
	import Fa from 'svelte-fa';

	onMount(() => {
		if (browser) {
			signInModalActive.set(true);
		}
	});
</script>

<div
	class="flex flex-col items-center justify-center h-full bg-gradient-to-b to-gray-300 from-white"
>
	<img src="/logo.svg" alt="logo" class="absolute top-4 w-50" />
	<Fa icon={faLock} class="mr-2 text-6xl opacity-10" />
	<h1 class="text-xl mt-4 opacity-50">Sign in required to access this</h1>
	<button class="btn mt-4" on:click={() => ($signInModalActive = true)}>Sign In</button>
</div>
