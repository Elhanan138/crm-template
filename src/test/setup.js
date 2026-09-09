import '@testing-library/jest-dom/vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// ProseMirror / TipTap stubs for jsdom
if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () => ({
    width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0,
    toJSON: () => {},
  });
}
if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => [];
}
// Radix menus, dropdowns, popovers and selects open on pointer events, which
// jsdom does not implement at all. Without these three, any test that opens one
// hangs until the suite times out rather than failing with something readable.
if (!window.PointerEvent) {
  window.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, props = {}) {
      super(type, props);
      this.pointerId = props.pointerId ?? 1;
      this.pointerType = props.pointerType ?? 'mouse';
      this.isPrimary = props.isPrimary ?? true;
    }
  };
}
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => {};
if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {};
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}