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