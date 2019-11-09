import React from 'react';
import { MouseTracker, TerminalPromptIntro } from './state';

const mouseTracker = new MouseTracker();
const terminalPromptIntro = new TerminalPromptIntro();

export default {
    mouseTracker: React.createContext(mouseTracker),
    terminalPromptIntro: React.createContext(terminalPromptIntro)
}