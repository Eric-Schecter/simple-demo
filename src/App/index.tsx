import React, { useRef, useEffect, useState } from 'react';
// import { Options } from './components/options/gui';
import styles from './index.module.scss';
import { Model } from './types';
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
    world.loadModel(Model.ROBOT);
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
    <img alt='title' src='img/title.png' className={styles.title} />
    {/* <Options containerRef={ref} world={world}/> */}
  </div>
}