<script lang="ts">
	import { browser } from '$app/environment';
	import { auth, type AuthState } from 'src/store/auth';
	import { signInModalActive } from 'src/store/modal';
	import UserDropChip from './UserDropChip.svelte';

	export let userServerSide: AuthState;

	$: authReal = !browser ? userServerSide : $auth.isLoading ? userServerSide || $auth : $auth;
</script>

{#if authReal.isLoading}
	...
{:else if !authReal.user}
	<button class="px-4 py-1 rounded-lg" on:click={() => ($signInModalActive = true)}>Sign in</button>
	<button class="px-4 py-1 rounded-lg bg-slate-800">Sign up</button>
{:else if authReal.user}
	<div class="mr-2">
		<UserDropChip auth={authReal} />
	</div>
{/if}
