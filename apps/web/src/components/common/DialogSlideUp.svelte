<script lang="ts">
	import { getSvelteContext } from 'src/store/editor';
	import { isMobile } from 'src/store/responsive';
	import Fa from 'svelte-fa';
	import { fly } from 'svelte/transition';

	let { editor } = getSvelteContext();
</script>

{#if $isMobile}
	<div
		transition:fly={{ y: 300, opacity: 1, duration: 200 }}
		class="bg-white fixed bottom-0 left-0 right-0 h-[300px] p-4 pt-0 pointer-events-auto z-[42]"
	>
		<button
			class="w-full flex items-center justify-center pb-4"
			on:click={() => editor.activateDialog('')}
		>
			<svg
				width="69"
				height="31"
				viewBox="0 0 69 31"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				xmlns:xlink="http://www.w3.org/1999/xlink"
			>
				<rect width="69" height="31" fill="url(#pattern022)" />
				<defs>
					<pattern id="pattern022" patternContentUnits="objectBoundingBox" width="1" height="1">
						<use
							xlink:href="#image0_1123_1469"
							transform="matrix(0.00666667 0 0 0.0148387 0 -0.00451613)"
						/>
					</pattern>
					<image
						id="image0_1123_1469"
						width="150"
						height="68"
						xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAABECAYAAABj98zGAAAAAXNSR0IArs4c6QAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAlqADAAQAAAABAAAARAAAAADHtkYjAAADWElEQVR4Ae2a2WoVQRRF82mFvglqnvVn4gBiFGdBo4gDiIov+hkaZ3EGMc4TxtkYHNbGPpKHmMSQmJi7NmxO9ZDuqtXVXafqpq9PSUACEpCABCQgAQlIQAISkIAEJCABCUhAAhKQgAQkIAEJSEACEpCABCQgAQlIQAISkIAEJCABCUhAAhKQgAQkIAEJSEACEpCABKYksIGjV/DglGd5cDICW9l5Ca+b7GCv7ms0/Ace6+JIF3cT1Z8JNA6dw2H3rovFsLGtINDwPhxIH7r4sosHiA2rXwQa4SLOC/gQh1lYPcXpaA2rSQgcZF9gverie+JjfAwP4F5Vo+FX8RM8iie+hMNsN6xmQGAP5wRevZXjlK91+zYSe0UraOhN/AJ/w2GSjnUP78JqlgSSmN7GARmocZVzbKlqGw27i9/gane+4rdwP1ZzRCCzxtM4kPP1SnzUxb3EpaBGI87jtC1DXuJn/Axfx8uxmkcCybcCPflX4usuHiI2/L+pUeEsF2TYrw71lnJenMu4YfUPCWTGmI5VM8hPlPNgjuMBvNjVqGDyxszo6iWpWfEQ+xpWC0hgN/dOBxvp4nfija68ibjYtJIKJVeqFyJ1r4R87WKrrPXp69sChCT6SXrzsOL7XdxOXGjtoALViap+lZCvXujKef/pCSTRP4Xz8L52McNNtrMQ+y/VuNkwzr2fdzFDtgk5EP5nHaXyeaj1s0eGnGwfxgN4vtS4cBLvJODVoZKQ597Z37BaAgQq0c9CYx7uF5wHfALP5Y+3WRLI0kC+SPky5V6VkO+n3LBaggSyWp2H/aCLKScvS9yMZ6t+/jDXSc6Ua8WjOIu5a7DqEQKDtPMsvoOrI1Rn+5ufSmpGWsNcrlUJ+SrKqkcJrKfdJ3E6RCX6NVxm+JxMjZ0XcP6mzv1IuRLyZZSVBH4TOEIpnaW+PpXwZ6V/ADd8Bee/LWrIq3NNyIGipiYwxOF0sJrNjVPOCnm2x3COTUzI2VQSmDmBnZyaTlS5V8om5DPn55nTEMhs8QzOzzAm5NPA8rAEJCABCUhAAhKQgAQkIAEJSEACEpCABCQgAQlIQAISkIAEJCABCUhAAhKQgAQkIAEJSEACEpCABCQgAQlIQAISkIAEJCABCUhAAr1F4CerSfe1tz7DQQAAAABJRU5ErkJggg=="
					/>
				</defs>
			</svg>
		</button>
		<slot />
	</div>
{:else}
	<div class="pt-2">
		<slot />
	</div>
{/if}
