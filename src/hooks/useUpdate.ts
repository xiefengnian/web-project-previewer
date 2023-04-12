import { useState } from 'react';

export const useUpdate = () => {
  const [_, set] = useState(0);
  return () => {
    set((_) => _ + 1);
  };
};
