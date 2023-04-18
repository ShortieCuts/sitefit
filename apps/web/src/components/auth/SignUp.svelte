<script lang="ts">
	import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';

	import { sendPasswordReset, signInWithOAuth, signUp } from 'src/store/auth';
	import { WrapLoader } from 'ui';
	import { FirebaseError } from 'firebase/app';
	import { browser } from '$app/environment';
	import { updateMe } from '$lib/client/api';
	import { redirect } from '@sveltejs/kit';

	let fname = '';
	let lname = '';
	let email = '';
	let password = '';
	let password2 = '';
	let failed = false;
	let loading = false;

	let passwordResetForm = false;
	let resetSuccess = false;

	let oauthError = '';
	let messageError = '';

	let redirectTo = '';

	$: {
		if (browser) {
			let params = new URLSearchParams(window.location.search);
			redirectTo = params.get('redirect') || '';
		}
	}

	async function handleSignUp(e: Event) {
		e.preventDefault();

		failed = false;
		loading = true;
		try {
			let newUser = await signUp(fname, lname, email, password);
			if (redirectTo) {
				location.href = redirectTo;
			} else {
				location.href = '/';
			}
		} catch (error) {
			if (error instanceof FirebaseError) {
				let fbError = error as FirebaseError;
				let messages = {
					'auth/email-already-in-use': 'An account already exists with this email address.',
					'auth/invalid-email': 'Please enter a valid email address.',
					'auth/operation-not-allowed': 'This email address is not allowed.',
					'auth/invalid-password': 'Please enter a stronger password.'
				};
				if ((messages as any)[fbError.code]) {
					messageError = (messages as any)[fbError.code];
				} else {
					messageError = 'An unknown error occurred. Please try again later.';
				}
			}
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

		<span class="font-bold opacity-30 mt-2">Welcome to CAD Mapper</span>
	</div>
	<div class="bg-gray-100 rounded-b-lg p-4 shadow-lg">
		<p class="mb-4">Let's get you started with an account</p>

		<WrapLoader {loading}>
			<form class="flex flex-col space-y-2" on:submit={handleSignUp}>
				<div class="flex flex-row">
					<div class="mr-1">
						<label for="fname">First Name</label>
						<input
							required
							name="First Name"
							id="fname"
							class="input-text"
							placeholder=""
							type="text"
							bind:value={fname}
						/>
					</div>
					<div class="ml-1">
						<label for="lname">Last Name</label>
						<input
							required
							name="Last Name"
							id="lname"
							class="input-text"
							placeholder=""
							type="text"
							bind:value={lname}
						/>
					</div>
				</div>

				<label for="email">Email Address</label>
				<input
					required
					name="email"
					id="email"
					class="input-text"
					placeholder="you@example.com"
					type="email"
					bind:value={email}
				/>

				<label for="password">Password</label>
				<input
					required
					min="8"
					name="password"
					id="password"
					class="input-text"
					type="password"
					placeholder="****"
					bind:value={password}
				/>

				<button class="btn btn-primary rounded-md bg-blue-400 py-1">Sign Up</button>
				{#if failed}
					<div class="text-red-500 text-sm text-center">{messageError}</div>
				{/if}
			</form>
		</WrapLoader>
	</div>

	<div class="bg-gray-100 mt-2 rounded-lg p-4 shadow-lg">
		<p class="mb-2">Quickly create an account with</p>

		<div class="flex flex-row space-x-2">
			<button on:click={() => handleOAuthSignIn('google')} class="btn w-full">
				<img class="mr-2 w-[24px]" src="/google.svg" alt="Google logo" /> Google
			</button>
		</div>
		{#if oauthError}
			<div class="text-red-500 text-sm text-center mt-2">{oauthError}</div>
		{/if}
	</div>
	<div class="flex items-center justify-center p-2">
		<a data-sveltekit-reload href="/login?redirect={redirectTo}"
			><Fa icon={faArrowLeft} class="mr-2 inline-block" /> Go Back</a
		>
	</div>
</div>
