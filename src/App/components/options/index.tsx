import React, { useEffect, useState } from 'react';
import styles from './index.module.scss';

type OptionProp = {
  id:number,
  name:string,
}

type Props = {
  cb: (index:number)=>void;
  customStyles:string;
  options:OptionProp[]
}

export const Options = ({ cb,customStyles,options }: Props) => {
  const [selected,setSelected] = useState<number>(0);
  useEffect(()=>{
    cb(selected);
  },[cb,selected])
  const click = (id:number) =>{
    setSelected(id);
  }

  return <div className={`${styles.options} ${customStyles}`}>
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