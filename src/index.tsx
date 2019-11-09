// index.tsx
import React, { useContext } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import context from './context';
import { observer } from 'mobx-react';
import { Terminal } from './features';

const Name = styled.a`
    font-size: 205px;
`;
const App = observer(() => {
    const { positionX } = useContext(context.mouseTracker)
    return (<>
        <Terminal />
        <Name>ETHAN HATHAWAY{positionX}A</Name>
    </>)
});

ReactDOM.render(<App />, document.getElementById('root'));
