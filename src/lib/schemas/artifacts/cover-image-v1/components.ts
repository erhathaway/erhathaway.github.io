import type { ArtifactComponentMap } from '../types';
import Editor from './Editor.svelte';
import Viewer from './Viewer.svelte';
import AdminList from './AdminList.svelte';
import Cover from './Cover.svelte';

export const coverImageV1Components: ArtifactComponentMap = {
	adminEditor: Editor,
	adminList: AdminList,
	adminProjectCover: Cover,
	publicViewLandingPage: Viewer,
	publicViewProjectPage: Viewer
};
