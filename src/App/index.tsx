import React, { useRef, useEffect, useState } from 'react';
import { Options } from './components/options/gui';
import styles from './index.module.scss';
import { World } from './world';


export const App = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [world, setWorld] = useState<World>();
  useEffect(() => {
    if (!ref.current) { return }
    const container = ref.current;
    setWorld(new World(container));
  }, [ref, setWorld])

  useEffect(() => {
    if (!world) {
      return;
    }
    world.draw();
    return () => world.dispose();
  }, [world])

  return <div className={styles.root}>
    <div
      ref={ref}
      className={styles.container}
      onClick={() => world?.click()}
      onMouseMove={e => world?.mousemove(e)}
    />
    <Options containerRef={ref} world={world}/>
  </div>
}