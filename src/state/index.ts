import { configure } from "mobx"

export { default as MouseTracker } from './mouse_tracker';
export { default as TerminalPromptIntro } from './terminal_prompt_intro';

configure({
    computedRequiresReaction: true,
    reactionRequiresObservable: true,
    enforceActions: 'always',
    isolateGlobalState: true
})
