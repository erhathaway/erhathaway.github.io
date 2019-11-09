import React from 'react';
import styled from 'styled-components';
import { Rnd } from 'react-rnd';

const Window = styled(Rnd)`
    height: 400px;
    width: 400px;
    // border: 1px solid black;
    border: 1px solid #dadada;
    border-radius: 7px;
    display: flex;
    background-color: white;
    // box-shadow: wheat 1px 1px 20px 0px;
    // box-shadow: #f5deb37d 1px 1px 5px 0px, #f9f9f9 3px 2px 20px 0px
    box-shadow: #ffe4b27d 1px 1px 1px 0px, #f9f9f9 3px 2px 20px 0px;
`

const NavBar = styled.nav`
    height: 30px;
    width: 100%;
    border-bottom: 1px solid black;
    // background-color: blue;
`

export default () => {
    return (<Window
        default={{
            x: 0,
            y: 0,
            width: 320,
            height: 200,
        }}
    >
        <NavBar />
        Window
      </Window>)
    // return <Window draggable={true} onDrag={d => console.log(d)} />
}
