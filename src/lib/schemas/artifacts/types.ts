import type { Component } from 'svelte';

export type ArtifactComponentContext =
	| 'adminEditor'
	| 'adminList'
	| 'adminProjectCover'
	| 'publicViewLandingPage'
	| 'publicViewProjectPage';

export type ArtifactComponentMap = Record<ArtifactComponentContext, Component<any>>;
