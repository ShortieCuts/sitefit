<script lang="ts">
	import { signOut, type AuthState } from 'src/store/auth';
	import { getUserInfoStore } from 'src/store/users';

	import Fa from 'svelte-fa';
	import Popover from 'svelte-smooth-popover/Popover.svelte';
	import { InfoPopover } from 'ui';
	import IconFile from '../icons/IconFile.svelte';
	import IconProject from '../icons/IconProject.svelte';
	import UserProfilePicture from './UserProfilePicture.svelte';
	import { faEnvelope, faUser } from '@fortawesome/free-solid-svg-icons';

	export let userId: string;
	export let showName: boolean = false;
	export let showPicture: boolean = true;
	export let small: boolean = false;

	$: userStore =
		userId == '' || userId == 'anon' || userId.startsWith('email:')
			? null
			: getUserInfoStore(userId);
	export let ringColor: string = '#e5e7eb';
</script>

{#if userStore && $userStore}
	<div title="{$userStore.firstName} {$userStore.lastName}">
		{#if showPicture}
			<UserProfilePicture {small} user={$userStore} {ringColor} />
		{/if}
		{#if showName}
			<div class="text-center text-sm text-gray-600">
				{$userStore.firstName}
				{$userStore.lastName}
			</div>
		{/if}
	</div>
{:else if userId.startsWith('email:')}
	<div
		title={userId.replace('email:', '')}
		class="w-10 h-10 rounded-full border-[2px] shadow-md uppercase flex items-center flex-row justify-center text-gray-400"
		style="background: #eee; border-color: {ringColor};"
	>
		<Fa icon={faEnvelope} />
	</div>
{:else}
	<div
		title="Anonymous user"
		class="w-10 h-10 rounded-full border-[2px] shadow-md uppercase flex items-center flex-row justify-center text-gray-400"
		style="background: #eee; border-color: {ringColor};"
	>
		<Fa icon={faUser} />
	</div>
{/if}
