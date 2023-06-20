<script lang="ts">
	import { browser } from '$app/environment';
	import { faLock } from '@fortawesome/free-solid-svg-icons';
	import SignIn from 'src/components/auth/SignIn.svelte';
	import { signInModalActive } from 'src/store/modal';
	import { auth } from 'src/store/auth';
	import { onMount } from 'svelte';
	import Fa from 'svelte-fa';

	$: {
		if (browser) {
			if ($auth.user) {
				let params = new URLSearchParams(window.location.search);
				let redirectTo = params.get('redirect') || '/';

				location.href = redirectTo;
			}
		}
	}

	onMount(() => {
		if (browser) {
			console.log('user', $auth);
			if ($auth.user) {
				location.href = '/';
			}
		}
	});
</script>

<div
	class="flex flex-col items-center justify-start pt-8 h-auto min-h-full bg-gradient-to-b to-gray-300 from-white"
>
	<SignIn />
</div>
