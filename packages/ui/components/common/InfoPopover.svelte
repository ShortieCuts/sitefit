<script lang="ts">
  import Popover from "svelte-smooth-popover/Popover.svelte";
</script>

<Popover
  showOnHover
  caretBg="#e5e7eb"
  offset={5}
  caretCurveAmount={0}
  caretWidth={5}
  align="right-middle"
>
  <div class="shadow-xl bg-gray-200 space-y-2 py-1 px-2 text-sm rounded-lg">
    <slot />
  </div>
</Popover>
