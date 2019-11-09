import { decorate, computed, observable, action, runInAction, autorun } from 'mobx';

const prompt = `
    Hi! 
    /n I'm a software engineer with a background
    /n in science.
    /n I build all sorts of things.
    /n With code, wood, electronics...
    /n You can also find me growing things. 
    /n Plants are one of my favorite things about life.
    /n Look around or drop me a line. I'm open to small projects and consulting work. 

    `
class TerminalPromptIntro {
    line: number;
    character: number;
    allPrompt: string[];
    shownPrompt: { [lineNumber: number]: string };

    constructor() {
        runInAction(() => {
            this.line = 0;
            this.character = 0;
            this.allPrompt = prompt.split('/n');
            this.shownPrompt = {};
            this.createPromptScheduler();
        })


    }

    createPromptScheduler() {
        this.line = 0;
        this.allPrompt.forEach((line, lineNumber) => {
            setTimeout(() => {
                line.split('').forEach((character, index) => {
                    setTimeout(() => {
                        runInAction(() => {
                            const shownLine = this.shownPrompt[lineNumber] || ''
                            this.shownPrompt[lineNumber] = shownLine + (character)
                        })
                    }, index + 1000)
                })
            }, lineNumber * 1000)
        })
    }
}

decorate(TerminalPromptIntro, {
    line: observable,
    character: observable,
    allPrompt: observable,
    shownPrompt: observable,
    createPromptScheduler: action
})

export default TerminalPromptIntro;