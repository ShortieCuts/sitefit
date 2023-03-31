<script lang="ts">
	import {
		faArrowLeft,
		faBackward,
		faCog,
		faComment,
		faDirections,
		faLocationArrow,
		faPlus,
		faSearch,
		faShare
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';

	import Popover from 'svelte-smooth-popover/Popover.svelte';
</script>

<div class="editor-scaffold">
	<div class="editor-bar h-16 bg-white flex flex-row">
		<div class="editor-bar-left flex-1 justify-start flex flex-row items-center pl-4">
			<div class="flex flex-row">
				<div class="flex flex-row items-center cursor-pointer">
					<img src="/logo.svg" class="w-10 h-10" alt="logo" />
					<b class="text-lg pl-2">LotFitter</b>
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
							class="shadow-xl bg-white border-gray-100 border-2 space-y-2 rounded-lg min-w-[150px] overflow-hidden"
						>
							<a href="/" class="flex flex-row items-center px-4 py-1 hover:bg-gray-100 text-sm">
								<div class="icon-sm mr-2"><Fa icon={faArrowLeft} /></div>
								Back to projects
							</a>
							<a href="/new" class="flex flex-row items-center px-4 py-1 hover:bg-gray-100 text-sm">
								<div class="icon-sm mr-2"><Fa icon={faPlus} /></div>
								New Project
							</a>
						</div>
					</Popover>
				</div>
			</div>
		</div>
		<div class="editor-bar-center flex-1 justify-center flex-row items-center px-2 hidden md:flex">
			<div
				class="search-bar relative h-10 w-60 lg:w-96 shadow-style rounded-lg border-[1px] border-gray-300 flex flex-row items-center"
			>
				<input
					class="absolute top-0 left-0 right-0 bottom-0 pl-8 rounded-lg outline-none"
					placeholder="Search (by Address, CAD name, Project name)"
				/>
				<Fa class="pointer-events-none text-1xl absolute z-10 ml-2" icon={faSearch} />
			</div>
			<button class="btn btn-icon-only w-10 h-10 flex items-center pr-0 text-xl ml-3 shadow-style"
				><Fa icon={faLocationArrow} /></button
			>
		</div>
		<div
			class="editor-bar-center flex-1 justify-end flex flex-row items-center my-auto space-x-4 h-8 pr-4"
		>
			<button class="btn shadow-style"><Fa icon={faComment} /> Comments</button>
			<button class="btn shadow-style"><Fa icon={faShare} /> Share</button>
			<button class="cursor-pointer hover:text-blue-500"><Fa icon={faCog} /></button>
		</div>
	</div>
</div>

<div class="bg-black h-full" />
