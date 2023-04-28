<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.scss';
	import SignInModal from '../components/modals/SignInModal.svelte';
	import { signInModalActive } from '../store/modal';
	import { createPortal } from '$lib/util/actions';
</script>

<slot />
<div use:createPortal={'root'} />

{#if $signInModalActive}
	<SignInModal />
{/if}
