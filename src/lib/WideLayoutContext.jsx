import { createContext, useContext, useEffect, useState } from 'react';

// Lets a page opt out of the 1600px container. Auto-resets on unmount.
const WideLayoutContext = createContext({ wide: false, setWide: () => {} });

export function WideLayoutProvider({ children }) {
  const [wide, setWide] = useState(false);
  return (
    <WideLayoutContext.Provider value={{ wide, setWide }}>
      {children}
    </WideLayoutContext.Provider>
  );
}

export function useWideLayout(enabled) {
  const { setWide } = useContext(WideLayoutContext);
  useEffect(() => {
    setWide(enabled);
    return () => setWide(false);
  }, [enabled, setWide]);
}

export function useIsWide() {
  return useContext(WideLayoutContext).wide;
}