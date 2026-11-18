<script lang="ts">
	import { resolve } from '$app/paths';
	import PolicyPage from '$lib/components/PolicyPage.svelte';
</script>

<PolicyPage title="Terms of Service" description="Terms for using Ethan Hathaway's personal portfolio and its administrative Google Photos import tools.">
	<p>
		These terms apply to erhathaway.com, operated by Ethan Hathaway. This is a personal portfolio
		of things I make. By using the website, you agree to these terms.
	</p>

	<h2>Using the portfolio</h2>
	<p>
		You may browse the public portfolio and share links to its pages. Unless stated otherwise,
		original photographs, writing, and other creative work belong to Ethan Hathaway or their
		respective rights holders. Viewing the site does not transfer ownership or grant permission
		to republish or commercially use that work. Please contact me for permission when needed;
		these terms do not limit uses permitted by applicable law.
	</p>

	<h2>Administrative tools and photo imports</h2>
	<p>
		Content-management and Google Photos import tools are intended for authorized administrators.
		Only connect accounts you are permitted to use and import content you own or have permission
		to use. You are responsible for selecting appropriate content and deciding what to publish.
	</p>
	<p>
		Importing creates copies in the site's storage. Publishing makes selected content available
		to visitors. Disconnecting Google Photos does not remove imported copies; remove those through
		the content-management tools or contact me. The integration does not modify or delete your
		original Google Photos items.
	</p>

	<h2>Acceptable use</h2>
	<p>
		Do not attempt unauthorized access to administrative accounts, interfere with the website,
		upload malicious content, or use the site in ways that violate others' rights or applicable law.
		Access to administrative tools may be restricted or removed to protect the website.
	</p>

	<h2>Availability and project information</h2>
	<p>
		The portfolio and its tools are provided as available, without a promise of uninterrupted
		service or error-free content. Features may change or become unavailable. Project descriptions
		document personal work and experience; evaluate their suitability and safety before relying
		on them for your own projects.
	</p>
	<p>
		To the extent permitted by applicable law, I am not responsible for losses resulting from
		use of, or inability to use, the website. Nothing in these terms excludes liability or rights
		that cannot lawfully be excluded.
	</p>

	<h2>Privacy and third-party services</h2>
	<p>
		The <a href={resolve('/privacy')}>Privacy Policy</a> explains how the site handles information,
		including Google Photos imports, authentication, and analytics. Services such as Google,
		Cloudflare, and Clerk are also subject to their own terms. This portfolio is not affiliated
		with or endorsed by Google.
	</p>

	<h2>Changes and contact</h2>
	<p>
		These terms may be updated as the website changes; the date above identifies the latest
		version. For questions, content permissions, or removal requests, email
		<a href="mailto:erhathaway@gmail.com">erhathaway@gmail.com</a>.
	</p>
</PolicyPage>
