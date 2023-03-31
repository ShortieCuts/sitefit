<script lang="ts">
	import { browser } from '$app/environment';
	import { faLock } from '@fortawesome/free-solid-svg-icons';
	import SignIn from 'src/components/auth/SignIn.svelte';
	import { signInModalActive } from 'src/store/modal';
	import { onMount } from 'svelte';
	import Fa from 'svelte-fa';
</script>

<div
	class="flex flex-col items-center justify-center h-full bg-gradient-to-b to-gray-300 from-white"
>
	<SignIn />
</div>
