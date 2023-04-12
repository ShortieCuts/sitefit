<script lang="ts">
	import { browser } from '$app/environment';
	import { faLock } from '@fortawesome/free-solid-svg-icons';
	import SignIn from 'src/components/auth/SignIn.svelte';
	import { signInModalActive } from 'src/store/modal';
	import { auth } from 'src/store/auth';
	import { onMount } from 'svelte';
	import Fa from 'svelte-fa';

	onMount(() => {
		if (browser) {
			if ($auth.user) {
				location.href = '/';
			}
		}
	});
</script>

<div
	class="flex flex-col items-center justify-center h-full bg-gradient-to-b to-gray-300 from-white"
>
	<SignIn />
</div>
