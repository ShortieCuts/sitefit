<script lang="ts">
	import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';

	import { signInModalActive } from 'src/store/modal';
	import { sendPasswordReset, signIn, signInWithOAuth } from 'src/store/auth';
	import { WrapLoader } from 'ui';
	import { FirebaseError } from 'firebase/app';
	import { browser } from '$app/environment';

	let email = '';
	let password = '';
	let failed = false;
	let loading = false;

	let passwordResetForm = false;
	let resetSuccess = false;

	let oauthError = '';

	let redirectTo = '';

	$: {
		if (browser) {
			let params = new URLSearchParams(window.location.search);
			redirectTo = params.get('redirect') || '';
		}
	}

	async function handleSignIn(e: Event) {
		e.preventDefault();

		failed = false;
		loading = true;
		try {
			let creds = await signIn(email, password);

			if (creds) {
				$signInModalActive = false;
				if (redirectTo) {
					setTimeout(() => {
						location.href = redirectTo;
					}, 1000);
				}
			}
		} catch (error) {
			failed = true;
			console.log(error);
		} finally {
			loading = false;
		}
	}

	async function handleReset(e: Event) {
		e.preventDefault();

		resetSuccess = false;
		loading = true;
		try {
			await sendPasswordReset(email);
			resetSuccess = true;
		} catch (error) {
		} finally {
			loading = false;
		}
	}

	async function handleOAuthSignIn(provider: string) {
		oauthError = '';
		try {
			await signInWithOAuth(provider);
			$signInModalActive = false;
		} catch (error) {
			if (error instanceof FirebaseError) {
				let fbError = error as FirebaseError;
				if (fbError.code == 'auth/account-exists-with-different-credential') {
					oauthError =
						'An account already exists with this email address. Please sign in with your password or correct oauth client.';
				} else {
					oauthError = 'An unknown error occurred. Please try again later.';
				}
			}
		} finally {
		}
	}
</script>

<div class="min-w-[300px] max-w-[300px]">
	<div class="flex flex-col items-center justify-center bg-gray-200 h-40 rounded-t-lg">
		<img src="/logo.svg" alt="logo" class="max-w-[80px] mb-2" />

		<span class="font-bold opacity-30 mt-2">CAD Mapper Login</span>
	</div>
	<div class="bg-gray-100 rounded-b-lg p-4 shadow-lg">
		{#if !passwordResetForm}
			<WrapLoader {loading}>
				<form class="flex flex-col space-y-2" on:submit={handleSignIn}>
					<label for="email">Email Address</label>
					<input
						id="email"
						class="input-text"
						placeholder="you@example.com"
						type="email"
						bind:value={email}
					/>
					<label for="password">Password</label>
					<input
						id="password"
						class="input-text"
						type="password"
						placeholder="****"
						bind:value={password}
					/>
					<div class="text-right pb-2">
						<button on:click|preventDefault={() => (passwordResetForm = true)} class="text-blue-400"
							>Forgot password?</button
						>
					</div>
					<button class="btn btn-primary rounded-md bg-blue-400 py-1">Sign in</button>
					{#if failed}
						<div class="text-red-500 text-sm text-center">Invalid email or password</div>
					{/if}
				</form>
			</WrapLoader>
		{:else}
			<WrapLoader {loading}>
				<form class="flex flex-col space-y-2" on:submit={handleReset}>
					<p>Reset Your Password</p>
					<label for="email">Email Address</label>
					<input
						id="email"
						class="input-text"
						placeholder="you@example.com"
						type="email"
						bind:value={email}
					/>
					<button class="btn btn-primary">Send Password Reset</button>

					{#if resetSuccess}
						<div class="text-green-500 text-sm text-center">
							Password reset sent, please check your inbox.
						</div>
					{/if}
				</form>
			</WrapLoader>
			<div class="flex items-center justify-center p-2">
				<button on:click={() => (passwordResetForm = false)}>
					<Fa icon={faArrowLeft} class="mr-2 inline-block" /> Go Back</button
				>
			</div>
		{/if}
	</div>

	<div class="bg-gray-100 mt-2 rounded-lg p-4 shadow-lg">
		<p class="mb-2">Or sign in with</p>

		<div class="flex flex-row space-x-2">
			<button on:click={() => handleOAuthSignIn('google')} class="btn w-full">
				<img class="mr-2 w-[24px]" src="/google.svg" alt="Google logo" /> Google
			</button>
		</div>
		{#if oauthError}
			<div class="text-red-500 text-sm text-center mt-2">{oauthError}</div>
		{/if}
	</div>
	<div class="flex bg-gray-100 rounded-lg p-4 mt-2">
		<a data-sveltekit-reload href="/signup?redirect={redirectTo}" class="mr-auto text-blue-400"
			>Or sign up for an account</a
		>
	</div>
	<div class="flex items-center justify-center p-2">
		<button on:click={() => ($signInModalActive = false)}
			><Fa icon={faArrowLeft} class="mr-2 inline-block" /> Go Back</button
		>
	</div>
</div>
