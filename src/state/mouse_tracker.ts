import { decorate, computed, observable, action, runInAction, autorun } from 'mobx';

export interface IMousePosition {
    x: number,
    y: number,
}

class MouseTracker {
    positionX: IMousePosition['x']
    positionY: IMousePosition['y']

    constructor() {
        runInAction(() => {
            this.positionX = 0;
            this.positionY = 0;
        })
        this.handleMouseMove = this.handleMouseMove.bind(this);

        this.createMouseMoveEventHandler();
    }

    createMouseMoveEventHandler() {
        document.onmousemove = this.handleMouseMove.bind(this);
    }

    handleMouseMove(event: MouseEvent) {
        var eventDoc, doc, body;

        const e = event || (window.event as MouseEvent); // IE-ism

        // If pageX/Y aren't available and clientX/Y are,
        // calculate pageX/Y - logic taken from jQuery.
        // (This is to support old IE)
        // if (e.pageX == null && e.clientX != null) {
        eventDoc = (e.target && (e.target as any).ownerDocument) || document;
        doc = eventDoc.documentElement;
        body = eventDoc.body;


        this.positionX = e.clientX +
            (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
            (doc && doc.clientLeft || body && body.clientLeft || 0);
        this.positionY = e.clientY +
            (doc && doc.scrollTop || body && body.scrollTop || 0) -
            (doc && doc.clientTop || body && body.clientTop || 0);
    }

    get position() {
        return {
            x: this.positionX,
            y: this.positionY
        }
    }
}

decorate(MouseTracker, {
    positionX: observable,
    positionY: observable,
    position: computed,
    handleMouseMove: action
})

export default MouseTracker;