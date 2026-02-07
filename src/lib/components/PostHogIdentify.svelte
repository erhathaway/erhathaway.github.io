<script lang="ts">
	import { useClerkContext } from 'svelte-clerk';
	import { identifyPostHogUser } from '$lib/posthog';

	const ctx = useClerkContext();

	$effect(() => {
		const email = ctx.user?.primaryEmailAddress?.emailAddress;
		identifyPostHogUser(email);
	});
</script>
