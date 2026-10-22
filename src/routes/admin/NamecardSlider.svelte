<script lang="ts">
	let {
		label,
		value,
		defaultValue,
		min,
		max,
		step = 1,
		unit = 'px',
		onChange
	}: {
		label: string;
		value: number;
		defaultValue: number;
		min: number;
		max: number;
		step?: number;
		unit?: string;
		onChange: (value: number) => void;
	} = $props();
</script>

<div>
	<div class="mb-2 flex items-center justify-between gap-2 text-xs">
		<span class="font-medium text-slate-600">{label}</span>
		<div class="flex items-center gap-2">
			<span class="text-slate-400 tabular-nums">{Number(value.toFixed(2))}{unit}</span>
			<button
				type="button"
				onclick={() => onChange(defaultValue)}
				disabled={value === defaultValue}
				aria-label="Reset {label.toLowerCase()}"
				class="text-slate-500 underline hover:text-slate-900 disabled:opacity-30">Reset</button
			>
		</div>
	</div>
	<input
		type="range"
		aria-label={label}
		{min}
		{max}
		{step}
		{value}
		oninput={(event) => onChange(event.currentTarget.valueAsNumber)}
		class="block w-full accent-slate-800"
	/>
</div>
