import React, { useContext } from 'react';
import styled from 'styled-components';
import { Rnd } from 'react-rnd';
import context from '../context';
import { observer } from 'mobx-react';

const Terminal = styled(Rnd)`
    height: 600px;
    width: 600px;
    border-radius: 8px;
    display: flex;
    background-color: white;
    box-shadow: rgba(0, 0, 0, 0.16) 0px 5px 40px;
    border: 1px solid #dedede;
`

const Inner = styled.div`
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
`

const NavBar = styled.nav`
    height: 70px;
    width: 100%;
    // border-bottom: 1px solid black;
    display: flex;
    align-items: center;
    justify-content: flex-end;
`
const Button = styled.button`
    border: none;
    height: 40px;
    width: 40px;
    border-radius: 50%;
    margin-right: 20px;
    background-color: #e8edfc;
    text-align: center;
    font-size: 30px;
    color: #4c87e2;

`

const Content = styled.div`
    width: calc(100% - 60px);
    flex-grow: 1
    margin: 30px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 20px;
    line-height: 32px;
    scroll-vertical: auto;

`;

export default observer(() => {
    const { shownPrompt } = useContext(context.terminalPromptIntro)
    console.log('shown prompt', shownPrompt)
    return (<Terminal
        default={{
            x: 0,
            y: 0,
            width: 600,
            height: 600,
        }}
    >
        <Inner>
            <NavBar >
                <Button>
                    -
            </Button>

                <Button>
                    +
                </Button>
            </NavBar>
            <Content>
                {Object.keys(shownPrompt).map((lineNumber) => (
                    <p key={`terminal-prompt-line-${lineNumber}`}>
                        {shownPrompt[lineNumber]}
                    </p>
                ))}
            </Content>

        </Inner>
    </Terminal>)
    // return <Window draggable={true} onDrag={d => console.log(d)} />
})