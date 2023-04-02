<script lang="ts">
	import { signOut, type AuthState } from 'src/store/auth';
	import { getUserInfoStore } from 'src/store/users';

	import Fa from 'svelte-fa';
	import Popover from 'svelte-smooth-popover/Popover.svelte';
	import { InfoPopover } from 'ui';
	import IconFile from '../icons/IconFile.svelte';
	import IconProject from '../icons/IconProject.svelte';
	import UserProfilePicture from './UserProfilePicture.svelte';

	export let userId: string;

	$: userStore = getUserInfoStore(userId);
	export let ringColor: string = '#e5e7eb';
</script>

<div title="{$userStore.firstName} {$userStore.lastName}">
	<UserProfilePicture user={$userStore} {ringColor} />
</div>
