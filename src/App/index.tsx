import React, { useRef, useEffect, useState } from 'react';
import { Options } from './components/options';
import styles from './index.module.scss';
import { Model, Selection } from './types';
import { World } from './world';

const optionsModel = [
  { id: Model.GLB, name: 'GLB' },
  { id: Model.STL, name: 'STL' },
  { id: Model.STP, name: 'STP' }
];

const optionsSelection = [
  { id: Selection.MESH, name: 'MESH' },
  { id: Selection.FACE, name: 'FACE' },
  { id: Selection.LINE, name: 'LINE' },
  { id: Selection.POINT, name: 'POINT' }
];

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
    <Options
      cb={(id: number) => world?.loadModel(id)}
      customStyles={styles.optionsModel}
      options={optionsModel}
    />
    <Options
      cb={(id: number) => world?.changeSelectionMode(id)}
      customStyles={styles.optionsSelectionMode}
      options={optionsSelection}
    />
  </div>
}