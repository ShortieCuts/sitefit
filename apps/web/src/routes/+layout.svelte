<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.scss';
	import SignInModal from '../components/modals/SignInModal.svelte';
	import { signInModalActive } from '../store/modal';
</script>

<slot />

{#if $signInModalActive}
	<SignInModal />
{/if}
