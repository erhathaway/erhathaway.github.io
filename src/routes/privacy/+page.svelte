<script lang="ts">
	import PolicyPage from '$lib/components/PolicyPage.svelte';
</script>

<PolicyPage title="Privacy Policy" description="How Ethan Hathaway's personal portfolio handles visitor information, Google Photos imports, and privacy requests.">
	<p>
		Ethan Hathaway operates erhathaway.com, a personal portfolio of woodworking, pottery,
		food, and other things I make. This policy explains how the website handles information
		about visitors and the Google Photos connection used to manage portfolio content.
	</p>

	<h2>Information the website uses</h2>
	<ul>
		<li>Visiting the site generates technical information such as your IP address, browser and device details, requested pages, and request times. Hosting and security providers process this information to deliver and protect the site.</li>
		<li>PostHog collects website usage information, including page views and interactions. Its analytics tools may use cookies or browser storage and may include session recordings when enabled. For signed-in users, an email address is associated with analytics to distinguish administrative activity.</li>
		<li>Clerk handles sign-in and session management for administration. It processes account information, such as an email address, and uses authentication cookies or browser storage.</li>
		<li>If you email me, I receive your email address and the information you choose to include so I can respond.</li>
	</ul>

	<h2>Google Photos access</h2>
	<p>
		The Google Photos integration is for authorized administration of this portfolio. Connecting
		an account lets the administrator select media through Google's Photos Picker. The site
		accesses only media explicitly shared through that picker, rather than browsing the entire
		library. This permission does not allow the site to modify or delete originals in Google Photos.
	</p>
	<p>
		Selected media and related information can include filenames, media types, creation dates,
		dimensions, and camera or exposure metadata when Google provides them. Imported photos and
		their associated metadata are copied to the site's Cloudflare storage for managing and
		displaying portfolio projects. Content selected for publication is made available to visitors.
	</p>
	<p>
		Google access and refresh tokens are stored encrypted in the site's database so the
		connection can be maintained. Google Photos data is used to provide the import and portfolio
		features, not sold or used for advertising or training general-purpose AI models. Use of
		information received from Google APIs follows the
		<a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>,
		including its Limited Use requirements.
	</p>

	<h2>Services and sharing</h2>
	<p>
		The site uses Cloudflare for hosting, storage, content delivery, and security; Clerk for
		authentication; PostHog for analytics; and Google for the Photos Picker and web fonts.
		These services receive information needed to provide their functions. Loading Google Fonts
		also sends your browser's font requests and related connection information to Google.
	</p>
	<p>
		I do not sell personal information. Information may be disclosed when needed to operate
		these features, investigate abuse, protect the website, or meet a legal obligation.
		Published portfolio content is visible publicly. External websites linked from this site
		have their own privacy practices.
	</p>

	<h2>Retention, disconnection, and deletion</h2>
	<p>
		Imported content is retained for portfolio use until it is removed. The administrator can
		remove imported items through the site's content-management tools. Disconnecting Google
		Photos removes the saved connection credentials and attempts to revoke access, but does
		not delete previously imported copies or change the originals in Google Photos.
		Access can also be revoked in your
		<a href="https://myaccount.google.com/connections">Google Account connections</a>.
	</p>
	<p>
		Operational records, analytics, and correspondence are retained as needed for their purposes,
		subject to the relevant service settings and legal requirements. Copies may remain in backups
		or caches until they expire. You can request access, correction, or deletion of information
		associated with you by emailing <a href="mailto:erhathaway@gmail.com">erhathaway@gmail.com</a>.
		I may need to verify the request before acting on it.
	</p>

	<h2>Your choices and updates</h2>
	<p>
		You can browse the public portfolio without connecting a Google account. Browser settings
		can limit cookies or clear stored website data, although doing so may affect sign-in and
		other functionality. For questions about this policy or the use of your information,
		contact <a href="mailto:erhathaway@gmail.com">erhathaway@gmail.com</a>.
	</p>
	<p>
		This policy may change as the website changes. The date above identifies the latest update.
		New uses of Google data that require additional permission will be disclosed before that
		data is used for a new purpose.
	</p>
</PolicyPage>
