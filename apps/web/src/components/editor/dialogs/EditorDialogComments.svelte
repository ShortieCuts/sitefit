<script lang="ts">
	import {
		faEllipsis,
		faFilter,
		faList,
		faListDots,
		faMapLocation,
		faTable
	} from '@fortawesome/free-solid-svg-icons';
	import UserCard from 'src/components/auth/UserCard.svelte';
	import UserChip from 'src/components/auth/UserChip.svelte';
	import ComboDrop from 'src/components/common/ComboDrop.svelte';
	import Icon from 'src/components/icon/Icon.svelte';
	import { getSvelteContext } from 'src/store/editor';
	import Fa from 'svelte-fa';
	import Popover from 'svelte-smooth-popover/Popover.svelte';
	import ContextMenu from '../common/ContextMenu.svelte';
	import RootComment from '../common/RootComment.svelte';
	import DialogSlideLeft from 'src/components/common/DialogSlideLeft.svelte';
	import { onDestroy } from 'svelte';
	import WrapLoader from '../../../../../../packages/ui/components/common/WrapLoader.svelte';

	const { editor, broker } = getSvelteContext();
	const { activeTool } = editor;
	const { rootComments } = broker;
	let commentBody: HTMLTextAreaElement | null = null;
	let addMode = false;
	let dialogOpen = false;
	let saving = false;

	let sortBy = 'unread';
	let newCommentText = '';

	$: sortedComments = [...$rootComments].sort((a, b) => {
		if (sortBy == 'unread') {
			if (a.read && !b.read) {
				return 1;
			} else if (!a.read && b.read) {
				return -1;
			} else {
				return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
			}
		} else {
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		}
	});

	async function handleSave() {
		if (commentBody) {
			if (!commentBody.value) {
				return false;
			}
			try {
				saving = true;
				await broker.createComment(0, 0, commentBody.value);
			} finally {
				saving = false;
			}
			dialogOpen = false;
			addMode = false;
		}
	}

	onDestroy(() => {
		dialogOpen = false;
	});
	let popoverKey = 0;
</script>

<DialogSlideLeft>
	<div class="flex flex-col">
		<div class="flex flex-row p-4">
			<button
				class="btn btn-fat shadow-style"
				class:btn-primary={$activeTool === 'comment'}
				on:click={() => {
					activeTool.set('select');
					dialogOpen = true;
				}}
			>
				<Icon icon="comment" /> New Comment
				{#key popoverKey && $activeTool != 'comment'}
					<Popover
						showOnClick
						caretBg="#f3f4f6"
						offset={5}
						caretCurveAmount={1}
						caretWidth={0}
						caretHeight={0}
						align="bottom-right"
						hideOnExternalClick={true}
					>
						<div
							class="shadow-xl bg-white border-gray-100 border-2 space-y-2 py-2 rounded-lg min-w-[150px]"
						>
							<button
								on:click={() => {
									addMode = true;
									dialogOpen = false;
									popoverKey++;
									setTimeout(() => {
										commentBody?.focus();
									}, 100);
								}}
								class="w-full flex flex-row items-center px-4 hover:bg-gray-100"
							>
								<Fa class="mr-2" icon={faList} /> Unpinned
							</button>
							<button
								on:click={() => {
									dialogOpen = false;
									popoverKey++;
									activeTool.set('comment');
									setTimeout(() => {
										editor.activateDialog('');
									}, 10);
								}}
								class="w-full flex flex-row items-center px-4 hover:bg-gray-100"
							>
								<Fa class="mr-2" icon={faMapLocation} /> Pinned
							</button>
						</div>
					</Popover>
				{/key}
			</button>

			<button class="ml-auto btn btn-fat shadow-style btn-icon-only">
				<Fa icon={faFilter} />
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
						class="shadow-xl bg-white border-gray-100 border-2 space-y-2 rounded-lg min-w-[150px] overflow-hidden p-4"
					>
						<div class="flex flex-row">
							<span class="mr-2">Sort By:</span>
							<ComboDrop
								bind:value={sortBy}
								options={[
									{
										name: 'Date',
										value: 'date'
									},
									{
										name: 'Unread',
										value: 'unread'
									}
								]}
							/>
						</div>
					</div>
				</Popover>
			</button>
		</div>
		<div class="flex flex-col p-4 space-y-4 flex-1">
			{#if addMode}
				<WrapLoader loading={saving}>
					<textarea
						class="p-2 rounded-md border w-full"
						bind:value={newCommentText}
						bind:this={commentBody}
					/>
					<div class="flex flex-row justify-end space-x-2">
						<button
							on:click={() => {
								addMode = false;
							}}
							class="btn">Cancel</button
						>
						<button
							class:disabled={newCommentText.length == 0}
							on:click={handleSave}
							class="btn btn-primary">Save</button
						>
					</div>
				</WrapLoader>
			{/if}
			{#each sortedComments as comment}
				<RootComment {comment} />
			{/each}
		</div>
	</div>
</DialogSlideLeft>
