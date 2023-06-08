<script lang="ts">
	import type { ProjectComment, ProjectCommentReply } from '$lib/types/comment';
	import UserChip from 'src/components/auth/UserChip.svelte';
	import ContextMenu from './ContextMenu.svelte';
	import { faArrowRight, faEllipsis } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import { getSvelteContext } from 'src/store/editor';
	import { WrapLoader } from 'ui';
	import { fade } from 'svelte/transition';
	import { auth } from 'src/store/auth';

	const { broker } = getSvelteContext();

	export let parentId: number;
	export let comment: ProjectCommentReply;

	let commentEl: HTMLElement;
	let editing = false;
	let saving = false;

	let reply = '';

	let textareaEl: HTMLTextAreaElement | null = null;

	async function handleSave() {
		if (!textareaEl) {
			editing = false;
			return;
		}
		saving = true;
		await broker.updateComment(comment.id, textareaEl.value);
		await broker.mutatedReply(parentId);
		saving = false;
		editing = false;
	}
</script>

<span
	class="pt-0.5 pl-4 min-h-[32px] flex flex-row items-center"
	class:chip-blue-override={$auth.user && comment.authorId == $auth.user.id}
>
	{#if comment.authorId == ''}
		<span class="text-gray-400">{comment.anonymousName}</span>
	{:else}
		<UserChip showName small showPicture={false} userId={comment.authorId} />
	{/if}
</span>
<div
	bind:this={commentEl}
	class="pl-4 group grid-flow-row w-full flex flex-row justify-between pr-4"
>
	<WrapLoader loading={saving} class="flex flex-col">
		{#if editing}
			<textarea bind:this={textareaEl} class="rounded-md border-2 border-gray-500 p-2"
				>{comment.text}</textarea
			>
			<div class="flex flex-row justify-end mt-2 space-x-2">
				<button
					on:click={() => {
						editing = false;
					}}
					class="btn">Cancel</button
				>
				<button on:click={handleSave} class="btn btn-primary">Save</button>
			</div>
		{:else}
			<p title={new Date(comment.createdAt).toLocaleString()}>
				{comment.text}
			</p>
		{/if}
	</WrapLoader>
	{#if !editing}
		<button class="text-gray-400 text-sm hidden group-hover:block" data-context>
			<Fa icon={faEllipsis} />
		</button>
	{/if}
</div>
<ContextMenu el={commentEl}>
	<button class=" text-gray-400 text-left" style="font-size: 0.75rem">
		{new Date(comment.createdAt).toLocaleString()}
	</button>
	{#if ($auth.user && comment.authorId == $auth.user.id) || comment.authorId == ''}
		<button
			on:click={() => {
				editing = true;
				setTimeout(() => {
					if (textareaEl) {
						textareaEl.focus();
					}
				}, 10);
			}}>Edit</button
		>
		<button
			on:click={async () => {
				saving = true;
				await broker.deleteComment(comment.id);
				broker.mutatedReply(parentId);
				saving = false;
			}}>Delete</button
		>
	{/if}
</ContextMenu>

<style lang="scss">
	:global(.chip-blue-override > div > div) {
		@apply text-blue-400;
	}
</style>
