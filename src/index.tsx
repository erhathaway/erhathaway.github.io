// index.tsx
import React, { useContext } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import context from './context';
import { observer } from 'mobx-react';
import { Terminal } from './features';

const AppContainer = styled.div`
    width: calc(100% - 80px);
    height: calc(100% - 80px);
    margin: 40px;
    overflow: hidden;
`;
const Name = styled.a`
    font-size: 18vw;
    color: #ecececad;
    // word-wrap: break-word;
    -webkit-text-stroke: 1px #dcdcdc;
    &::after {
        content: "";
        display: inline-block;
        width: 100%;
      }
`;
const App = observer(() => {
    const { positionX } = useContext(context.mouseTracker)
    return (
        <AppContainer>
            <Terminal />
            <Name>ETHAN HATHAWAY @erhathway</Name>
        </AppContainer >)
});

ReactDOM.render(<App />, document.getElementById('root'));
