<script lang="ts">
	import {
		faAngleRight,
		faCaretRight,
		faEnvelope,
		faExternalLink,
		faPerson,
		faQuestionCircle,
		faSignOut,
		faUser,
		faUserCircle,
		faWallet
	} from '@fortawesome/free-solid-svg-icons';
	import type { PageData } from './$types';

	import AppLanding from 'src/components/nav/AppLanding.svelte';
	import MobileBar from 'src/components/nav/MobileBar.svelte';
	import Fa from 'svelte-fa';
	import { auth, sendPasswordReset, signOut } from 'src/store/auth';
	import { WrapLoader } from 'ui';
	export let data: PageData;

	let loading = false;
	let sent = false;
</script>

<AppLanding auth={data.user}>
	<div class="flex flex-col pb-20 space-y-2">
		<div class="-mx-4 border-t-[6px] border-gray-100 left-0" />
		<div class="flex flex-row text-lg items-center py-2 px-2">
			<Fa class="text-2xl" icon={faUserCircle} />
			<span class="ml-4">Account</span>
		</div>
		<div class="flex flex-col pl-8">
			<span class="mb-2 font-bold">Name:</span>
			<div class="flex flex-row space-x-2">
				<input
					type="text"
					class="border rounded p-1 w-1/2"
					placeholder="First name"
					value={$auth.user?.firstName}
				/>
				<input
					type="text"
					class="border rounded p-1 w-1/2"
					placeholder="Last name"
					value={$auth.user?.lastName}
				/>
			</div>
		</div>
		<div class="flex flex-col pl-8 pt-4">
			<span class="mb-2 font-bold">Email:</span>
			<div class="flex flex-row space-x-2">
				<input
					type="text"
					class="border rounded p-1 w-full text-gray-400"
					placeholder="Email"
					readonly
					value={$auth.user?.email}
				/>
			</div>
		</div>

		{#if $auth.firebaseUser?.providerId == 'firebase' || $auth.firebaseUser?.providerId == 'password' || $auth.firebaseUser?.providerId == 'email'}
			<div class="flex flex-col pl-8 pt-4">
				<div class="flex flex-row space-x-2">
					<WrapLoader {loading}>
						<button
							class="flex flex-row items-center font-bold"
							on:click={async () => {
								loading = true;
								if ($auth.user?.email) await sendPasswordReset($auth.user?.email);
								sent = true;
								loading = false;
							}}
						>
							Change Password <Fa class="ml-2 text-lg opacity-25" icon={faExternalLink} />
						</button>
					</WrapLoader>
				</div>
				{#if sent}
					<span class="text-sm text-gray-400">Password reset email sent</span>
				{/if}
			</div>
		{/if}

		<div class="pt-4" />
		<div class="-mx-4 border-t-[6px] border-gray-100 left-0" />
		<div class="flex flex-row text-lg items-center py-2 px-2">
			<Fa class="text-2xl" icon={faWallet} />
			<span class="ml-4">Subscription</span>
		</div>
		<div class="flex flex-col pl-8 pt-4">Plan: Free beta</div>
	</div>
</AppLanding>
