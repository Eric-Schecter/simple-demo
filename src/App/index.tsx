import React, { useRef, useEffect, useState } from 'react';
import styles from './index.module.scss';
import { Mode } from './types';
import { World } from './world';

type Props = {
  world?: World;
}

const options = [{id:Mode.GLB,name:'GLB'},{id:Mode.STL,name:'STL'},{id:Mode.STP,name:'STP'}];

const Options = ({ world }: Props) => {
  const [selected,setSelected] = useState<Mode>(0);
  useEffect(()=>{
    if(!world){
      return;
    }
    world.loadModel(selected);
  },[world,selected])
  const click = (id:Mode) =>{
    if(!world){
      return;
    }
    setSelected(id);
  }

  return <div className={styles.options}>
    {options.map(({id,name}) =>
      <div
        key={id}
        className={`${styles.option} ${selected === id ? styles.isSelected : null}`}
        onClick = {()=>click(id)}
      >
        {name}
        </div>
    )}
  </div>
}

export const App = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [world,setWorld] = useState<World>();
  useEffect(() => {
    if (!ref.current) { return }
    const container = ref.current;
    setWorld(new World(container));
  }, [ref,setWorld])

  useEffect(()=>{
    if(!world){
      return;
    }
    world.draw();
    return () => world.dispose();
  },[world])

  return <div className={styles.root}>
    <div
      ref={ref}
      className={styles.container}
      onClick={() => world?.click()}
      onMouseMove={e => world?.mousemove(e)}
    />
    <Options world={world} />
  </div>
}