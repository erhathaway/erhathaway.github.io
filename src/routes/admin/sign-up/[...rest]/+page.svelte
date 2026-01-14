<script lang="ts">
	import { SignUp } from 'svelte-clerk';
</script>

<div class="min-h-screen bg-cream text-walnut flex items-center justify-center p-8">
	<div class="max-w-md w-full">
		<div class="text-center mb-8">
			<a href="/" class="inline-block font-display text-2xl font-normal text-walnut no-underline leading-tight mb-4">
				Ethan<br>Hathaway
			</a>
			<h1 class="font-display text-3xl text-walnut mb-2">Create Account</h1>
			<p class="text-ash">Join to manage this portfolio</p>
		</div>

		<div class="bg-white rounded-lg p-6 shadow-sm border border-walnut/10">
			<SignUp
				appearance={{
					elements: {
						formButtonPrimary: 'bg-copper hover:bg-copper/90 text-cream',
						footerActionLink: 'text-copper hover:text-copper/80'
					}
				}}
				redirectUrl="/admin"
			/>
		</div>

		<div class="text-center mt-6">
			<a href="/" class="text-ash hover:text-copper transition-colors text-sm">
				← Back to Portfolio
			</a>
		</div>
	</div>
</div>