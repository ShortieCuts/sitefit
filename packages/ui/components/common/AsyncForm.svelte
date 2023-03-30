<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import WrapLoader from "./WrapLoader.svelte";

  const dispatch = createEventDispatcher();
  let loading = false;
  let error = false;
  let errorMessage = "";

  export let action: string;

  async function handleSubmit(event: Event) {
    error = false;

    event.preventDefault();
    const form = event.target as HTMLFormElement;
    let data: { [key: string]: any } = {};

    for (let i = 0; i < form.elements.length; i++) {
      const element = form.elements[i] as HTMLInputElement;
      if (element.name) {
        data[element.name] = element.value;
      }
    }

    loading = true;
    try {
      const response = (await fetch(form.action, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }).then((res) => res.json())) as any;

      if (response.success) {
        loading = false;
        dispatch("success", response.data);
      } else {
        loading = false;
        error = true;
        errorMessage = response.error;
      }
    } catch (e) {
      loading = false;
      error = true;
      errorMessage =
        "Server error (make sure you're connected to the internet)";
    }
  }
</script>

<form on:submit={handleSubmit} {action}>
  <WrapLoader {loading}>
    <slot />
  </WrapLoader>
  {#if error}
    <div class="text-red-500">{errorMessage}</div>
  {/if}
</form>
