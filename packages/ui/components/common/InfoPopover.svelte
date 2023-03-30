<script lang="ts">
  import Popover from "svelte-smooth-popover/Popover.svelte";
</script>

<Popover
  showOnHover
  caretBg="#1f2937"
  offset={10}
  caretCurveAmount={1}
  caretWidth={20}
  alignAnchor="top-right"
>
  <div
    class="shadow-xl bg-gray-800 space-y-2 py-1 px-2 text-sm rounded-lg min-w-[150px]"
  >
    <slot />
  </div>
</Popover>
