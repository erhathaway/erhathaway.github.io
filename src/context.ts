import React from 'react';
import { MouseTracker } from './state';

const mouseTracker = new MouseTracker();

export default {
    mouseTracker: React.createContext(mouseTracker)
}