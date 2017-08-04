import React from 'react';
import Tile from '../../features/LandingDisplayTile/Main';

const styles = {
  container: {
    height: '600px',
    flexGrow: 1,
    // overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',


  },
  row: {
    height: '33%',
    width: '100%',
    display: 'flex',
    alignContent: 'stretch',
    flexFlow: 'row wrap',
  },

};

const Main = () => (
  <div style={styles.container}>
    <div style={styles.row}>
      <Tile widthPriority={1} flexBasis={'20%'} overlaycolor={'rgba(91, 192, 235, 0.6)'} onClick={()    =>{}} />
      <Tile widthPriority={2} flexBasis={'33%'} overlaycolor={'rgba(155, 197, 61, 0.6)'} onClick={()    =>{}} />
      <Tile widthPriority={1} flexBasis={'20%'} overlaycolor={'rgba(250, 121, 33, 0.6)'} onClick={()    =>{}} />
    </div>
    <div style={styles.row}>
      <Tile widthPriority={3} flexBasis={'12.5%'} overlaycolor={'rgba(229, 89, 52, 0.6'} onClick={()    =>{}} />
      <Tile widthPriority={2} flexBasis={'12.5%'} overlaycolor={'rgba(155, 197, 61, 0.6)'} onClick={()    =>{}} />
      <Tile widthPriority={5} flexBasis={'12.5%'} overlaycolor={'rgba(253, 231, 76, 0.6)'} onClick={()    =>{}} />
      <Tile widthPriority={2} flexBasis={'12.5%'} overlaycolor={'rgba(229, 89, 52, 0.6'} onClick={()    =>{}} />
      <Tile widthPriority={1} flexBasis={'12.5%'} overlaycolor={'rgba(253, 231, 76, 0.6)'} onClick={()    =>{}} />
    </div>
    <div style={styles.row}>
      <Tile widthPriority={1.5} flexBasis={'25%'} overlaycolor={'rgba(253, 231, 76, 0.6)'} onClick={()    =>{}} />
      <Tile widthPriority={4} flexBasis={'25%'} overlaycolor={'rgba(91, 192, 235, 0.6)'} onClick={()    =>{}} />
      <Tile widthPriority={1} flexBasis={'25%'} overlaycolor={'rgba(155, 197, 61, 0.6)'} onClick={()    =>{}} />
    </div>
  </div>
);

export default Main;
