<script lang="ts">
	import type { UserAccessInfo } from '$lib/types/user';
	import { compareAccess } from '$lib/util/access';
	import {
		faArrowRight,
		faEarth,
		faEnvelope,
		faLock,
		faPaperPlane,
		faTimes
	} from '@fortawesome/free-solid-svg-icons';
	import UserChip from 'src/components/auth/UserChip.svelte';
	import ComboDrop from 'src/components/common/ComboDrop.svelte';
	import { auth } from 'src/store/auth';
	import { getSvelteContext } from 'src/store/editor';
	import Fa from 'svelte-fa';
	import { fade, fly, slide } from 'svelte/transition';
	import WrapLoader from 'ui/components/common/WrapLoader.svelte';

	const { broker, editor } = getSvelteContext();
	const { name, access } = broker.metadata;
	const { sessionAccess } = broker;

	let inviteName = '';

	$: readonly = !compareAccess('WRITE', $sessionAccess);

	const permMapping = {
		WRITE: 'edit',
		COMMENT: 'comment',
		READ: 'view'
	};
	const permMappingAlt = {
		WRITE: 'editor',
		COMMENT: 'commenter',
		READ: 'viewer'
	};

	let generalLoading = false;
	let sendLoading = false;
	let inviteLoading = new Map<string, boolean>();

	let isInviting = false;
	let inviteList: string[] = [];
	let inviteAccess: 'READ' | 'COMMENT' | 'WRITE' = 'WRITE';

	function handleAdd() {
		if (inviteName != '') {
			isInviting = true;
			inviteList = [...inviteList, inviteName];
			inviteName = '';
		}
	}

	async function handleSend() {
		sendLoading = true;
		await editor.guard(broker.grantAccess(inviteList.join(','), inviteAccess));
		sendLoading = false;
		isInviting = false;
		inviteList = [];
	}

	let copyLinkEl: HTMLInputElement;
</script>

<div class="p-6 flex flex-col space-y-4">
	<h2 class="text-2xl">Share "{$name}"</h2>
	{#if compareAccess('WRITE', $sessionAccess)}
		<div class="relative flex-row">
			<input
				bind:value={inviteName}
				on:keydown={(e) => {
					if (e.key === 'Enter') {
						handleAdd();
					}
				}}
				placeholder="Invite by email"
				class="rounded-lg input-text"
				style="padding: 0.5rem 1rem; background-color: white;"
			/>
			{#if inviteName != ''}
				<button
					on:click={handleAdd}
					transition:fade={{ duration: 200 }}
					class="absolute top-1 bottom-1 right-1 w-8 text-white bg-blue-500 rounded-md flex items-center justify-center hover:bg-blue-600"
					><Fa icon={faArrowRight} /></button
				>
			{/if}
		</div>
	{/if}

	{#if isInviting}
		<WrapLoader loading={sendLoading}>
			<div transition:slide={{ duration: 200 }} class="flex flex-col space-y-4">
				<div class="flex flex-row flex-wrap">
					{#each inviteList as email}
						<div
							class="flex flex-row rounded-full px-2 py-1 items-center border border-gray-300 hover:shadow-sm mr-2 mb-2"
						>
							{email}
							<button
								class="ml-2 rounded-full hover:text-red-500 flex items-center justify-center"
								on:click={() => {
									inviteList = inviteList.filter((e) => e != email);
									if (inviteList.length == 0) isInviting = false;
								}}
							>
								<Fa icon={faTimes} />
							</button>
						</div>
					{/each}
				</div>
				<div class="p-2 rounded border border-gray-300 flex flex-row justify-center">
					<span class="mr-2">Invite as: </span>
					<ComboDrop
						{readonly}
						options={[
							{ name: 'Viewer', value: 'READ' },
							{ name: 'Commenter', value: 'COMMENT' },
							{ name: 'Editor', value: 'WRITE' }
						]}
						bind:value={inviteAccess}
					/>
				</div>
				<div class="flex flex-row space-x-4">
					<button
						class="btn flex-1"
						on:click={() => {
							isInviting = false;
							inviteList = [];
						}}
					>
						Cancel
					</button>
					<button class="flex-1 btn btn-primary" on:click={handleSend}>Send</button>
				</div>
			</div>
		</WrapLoader>
	{:else}
		<div
			class="space-y-4"
			transition:slide={{
				duration: 200
			}}
		>
			<div>
				<h2 class="text-lg">Users with access</h2>
				{#each $access.items as user}
					<WrapLoader loading={inviteLoading.get(user.email) ?? false}>
						<div class="flex flex-row items-center py-2">
							{#if user.userId}
								<UserChip userId={user.userId} ringColor={'#ffffff'} />
							{:else}
								<div
									class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-black text-opacity-50"
								>
									<Fa icon={faEnvelope} />
								</div>
							{/if}
							<div class="flex flex-col flex-1 ml-2">
								<div class="">
									{user.firstName}
									{user.lastName}
									{#if user.userId === $auth.user?.id}
										<span class=""> (you)</span>
									{/if}
								</div>
								<div class="text-opacity-50 text-black font-thin text-sm">
									{user.email}
								</div>
							</div>
							<div class="flex flex-row">
								{#if user.access == 'OWNER'}
									<span class="capitalize text-black text-opacity-50"
										>{user.access.toLowerCase()}</span
									>
								{:else}
									<ComboDrop
										{readonly}
										options={[
											{ name: 'Viewer', value: 'READ' },
											{ name: 'Commenter', value: 'COMMENT' },
											{ name: 'Editor', value: 'WRITE' },
											{ name: 'Remove', value: 'REMOVE' }
										]}
										value={user.access}
										on:select={async (e) => {
											inviteLoading.set(user.email, true);
											inviteLoading = inviteLoading;
											if (e.detail == 'REMOVE') {
												await editor.guard(broker.revokeAccess(user.email));
											} else {
												await editor.guard(broker.grantAccess(user.email, e.detail));
											}

											inviteLoading.set(user.email, false);
											inviteLoading = inviteLoading;
										}}
									/>
								{/if}
							</div>
						</div>
					</WrapLoader>
				{/each}
			</div>
			<div>
				<h2 class="text-lg mb-2">General access</h2>
				<WrapLoader loading={generalLoading}>
					<div class="flex flex-row items-center">
						<div
							class="w-10 h-10 rounded-full {$access.blanketAccessGranted
								? 'bg-green-200'
								: 'bg-stone-200'} flex items-center justify-center text-black text-opacity-50"
						>
							<Fa icon={$access.blanketAccessGranted ? faEarth : faLock} />
						</div>
						<div class="flex-1 ml-2" style="line-height: 1.2rem;">
							<ComboDrop
								{readonly}
								options={[
									{ name: 'Anyone with the link', value: true },
									{ name: 'Restricted', value: false }
								]}
								value={$access.blanketAccessGranted}
								on:select={async (e) => {
									generalLoading = true;
									await editor.guard(broker.setBlanketAccessMode(e.detail));
									generalLoading = false;
								}}
							/>
							{#if $access.blanketAccessGranted}
								<div class="text-sm text-black text-opacity-50 ml-1">
									Anyone on with the link can {permMapping[$access.blanketAccess]}
								</div>
							{:else}
								<div class="text-sm text-black text-opacity-50 ml-1">
									Only users invited above can access this project
								</div>
							{/if}
						</div>
						{#if $access.blanketAccessGranted}
							<div>
								<ComboDrop
									{readonly}
									options={[
										{ name: 'View', value: 'READ' },
										{ name: 'Comment', value: 'COMMENT' },
										{ name: 'Edit', value: 'WRITE' }
									]}
									value={$access.blanketAccess}
									on:select={async (e) => {
										generalLoading = true;
										await editor.guard(broker.setBlanketAccess(e.detail));
										generalLoading = false;
									}}
								/>
							</div>
						{/if}
					</div>
					{#if $access.blanketAccessGranted}
						<div
							class="relative mt-4 space-x-2 flex flex-row items-center"
							transition:slide={{ duration: 200 }}
						>
							<input
								bind:this={copyLinkEl}
								type="text"
								class="input-text"
								style="background-color: white; padding-left: 0.5rem; padding-right: 0.5rem;"
								value={location.href}
								readonly
								on:focus={(e) => {
									copyLinkEl.select();
								}}
							/>
							<button
								class="btn"
								on:click={(e) => {
									copyLinkEl.select();
									navigator.clipboard.writeText(location.href);
								}}>Copy</button
							>
						</div>
					{/if}
				</WrapLoader>
			</div>
		</div>
	{/if}
</div>
