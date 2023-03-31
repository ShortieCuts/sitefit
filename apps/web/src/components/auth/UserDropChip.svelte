<script lang="ts">
	import {
		faArrowRight,
		faChevronDown,
		faCircle,
		faCog,
		faEnvelope,
		faGlobe,
		faGrip,
		faMessage,
		faPerson,
		faSignOut,
		faTag,
		faUser
	} from '@fortawesome/free-solid-svg-icons';
	import { signOut, type AuthState } from 'src/store/auth';
	export let auth: AuthState;
	import Fa from 'svelte-fa';
	import Popover from 'svelte-smooth-popover/Popover.svelte';
	import IconFile from '../icons/IconFile.svelte';
	import IconProject from '../icons/IconProject.svelte';
	import UserProfilePicture from './UserProfilePicture.svelte';

	$: photoURL = auth.user?.photoURL || '/user-photo-placeholder.svg';
</script>

{#if auth.user}
	<button class="flex flex-row items-center justify-center space-x-2">
		<UserProfilePicture user={auth.user} />

		<Popover
			showOnClick={true}
			hideOnExternalClick
			caretBg="#f3f4f6"
			offset={10}
			caretCurveAmount={1}
			caretWidth={20}
			alignAnchor="top-right"
		>
			<div
				class="shadow-xl bg-white border-gray-100 border-2 space-y-2 py-2 rounded-lg min-w-[150px]"
			>
				<div class="flex flex-row items-center px-4 pt-2 font-bold">
					{auth.user?.firstName ?? ''}
					{auth.user?.lastName ?? ''}
				</div>
				<div class="flex flex-row items-center px-4 pb-2 text-sm">
					{auth.user?.email ?? 'No email'}
				</div>
				<div class="border-b-2 border-gray-100" />
				<div>
					<a href="/" class="flex flex-row items-center px-4 py-2 hover:bg-gray-100">
						<div class="icon-sm mr-2"><IconProject /></div>
						Projects
					</a>
					<a href="/files" class="flex flex-row items-center px-4 py-2 hover:bg-gray-100">
						<div class="icon-sm mr-2"><IconFile /></div>
						CADs
					</a>
					<a href="/user/settings" class="flex flex-row items-center px-4 py-2 hover:bg-gray-100">
						<Fa class="mr-2" icon={faCog} /> Settings
					</a>
				</div>
				<div class="border-b-2 border-gray-100" />
				<div>
					<button
						class="flex flex-row items-center w-full text-left px-4 py-2 hover:bg-gray-100"
						on:click={() => signOut()}
					>
						<Fa class="mr-2" icon={faSignOut} /> Sign Out
					</button>
				</div>
			</div>
		</Popover>
	</button>
{/if}
