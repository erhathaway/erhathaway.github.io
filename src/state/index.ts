import { configure } from "mobx"

export { default as MouseTracker } from './mouse_tracker';

configure({
    computedRequiresReaction: true,
    reactionRequiresObservable: true,
    enforceActions: 'always',
    isolateGlobalState: true
})
