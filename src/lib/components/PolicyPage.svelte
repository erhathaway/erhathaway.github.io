<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';

	let { title, description, children }: {
		title: string;
		description: string;
		children: Snippet;
	} = $props();
</script>

<svelte:head>
	<title>{title} — Ethan Hathaway</title>
	<meta name="description" content={description} />
</svelte:head>

<div class="policy-page">
	<header>
		<a class="site-name" href={resolve('/')}>Ethan Hathaway <span>Things I Make</span></a>
		<a href={resolve('/')}>Back to the portfolio <span aria-hidden="true">↗</span></a>
	</header>
	<main id="policy-content">
		<div class="title-block">
			<p class="eyebrow">About this website</p>
			<h1>{title}</h1>
			<p class="updated">Last updated <time datetime="2026-11-17">November 17, 2026</time></p>
		</div>
		<article aria-label={title}>{@render children()}</article>
	</main>
	<footer>
		<span>Ethan Hathaway · Things I Make</span>
		<nav aria-label="Website policies">
			<a href={resolve('/privacy')}>Privacy Policy</a>
			<a href={resolve('/terms')}>Terms of Service</a>
			<a href="mailto:erhathaway@gmail.com">Contact</a>
		</nav>
	</footer>
</div>

<style>
	.policy-page { max-width: 1080px; margin: 0 auto; padding: 32px clamp(24px, 5vw, 64px); color: #2c2218; font-family: 'DM Sans', sans-serif; }
	header, footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 24px; font-size: 13px; }
	header { padding-bottom: 24px; border-bottom: 1px solid #b8733333; }
	.site-name { display: grid; gap: 4px; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 24px; text-decoration: none; }
	.site-name span { font-family: 'DM Sans', sans-serif; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; }
	main { max-width: 680px; margin: 64px auto 80px; }
	.title-block { border-left: 1px solid #b87333; padding-left: 24px; margin-bottom: 40px; }
	.eyebrow { color: #806247; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; }
	h1 { margin: 10px 0 16px; font-family: 'Cormorant Garamond', Georgia, serif; font-size: clamp(40px, 7vw, 60px); font-weight: 400; line-height: 1.1; }
	.updated { color: #756b62; font-size: 12px; }
	article { font-size: 15px; line-height: 1.8; }
	article :global(h2) { margin: 32px 0 12px; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 29px; font-weight: 500; line-height: 1.2; }
	article :global(p) { margin: 0 0 16px; }
	article :global(ul) { list-style: disc; padding-left: 22px; margin: 0 0 20px; }
	article :global(li) { margin-bottom: 8px; }
	a, article :global(a) { color: inherit; text-decoration: underline; text-decoration-color: #b8733380; text-underline-offset: 4px; }
	a:hover, article :global(a:hover) { color: #925522; }
	a:focus-visible, article :global(a:focus-visible) { outline: 2px solid #b87333; outline-offset: 5px; }
	footer { padding: 24px 0 8px; border-top: 1px solid #b8733333; color: #756b62; font-size: 12px; }
	nav { display: flex; flex-wrap: wrap; gap: 20px; }
	@media (max-width: 600px) { main { margin: 40px auto 56px; } header { align-items: flex-start; } }
</style>
