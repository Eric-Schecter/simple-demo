import { RefObject, useEffect } from "react";
import { World } from "../../world";
import { GUIHandler } from "./guiHandler";

type Props = {
  containerRef: RefObject<HTMLDivElement>;
  world?: World;
}

export const Options = ({ containerRef, world }: Props) => {
  useEffect(() => {
    if (!containerRef.current || !world) {
      return;
    }
    const gui = new GUIHandler(containerRef.current, world);
    return () => gui.dispose();
  }, [containerRef, world])

  return null;
}