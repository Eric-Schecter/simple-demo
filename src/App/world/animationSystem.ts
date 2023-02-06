import { AnimationMixer, AnimationAction, LoopOnce } from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { KeycodeAnimation, KeycodePhysics } from './types';

export class AnimationSystem {
  private actions: { [key: string]: AnimationAction } = {};
  private mixer: AnimationMixer;
  private current?: AnimationAction;
  private currentPriority = Math.max();
  private duration = 1;
  private actionTable: { [prop: string]: string } = {
    [KeycodeAnimation.Dance]: 'Dance',
    [KeycodeAnimation.Sitting]: 'Sitting',
    [KeycodeAnimation.Standing]: 'Standing',
    [KeycodeAnimation.Yes]: 'Yes',
    [KeycodeAnimation.No]: 'No',
    [KeycodeAnimation.Wave]: 'Wave',
    [KeycodeAnimation.ThumbsUp]: 'ThumbsUp',
    [KeycodeAnimation.Jump]: 'Jump',
    [KeycodeAnimation.Punch]: 'Punch',
  };

  // priority 1: Punch(stop momement)，Jump
  // priority 2: Idle,Walking,Running, decided by movemenet
  // priority 3: Dance, Death, Sitting, Standing, Yes, No, Wave, ThumbsUp, able to use when 'idle' state active, decided by actionTable
  private priority: { [prop: string]: number } = {
    Punch: 1,
    Jump: 1,
    Idle: 2,
    Walking: 2,
    Running: 2,
    Dance: 3,
    Death: 3,
    Sitting: 3,
    Standing: 3,
    Yes: 3,
    No: 3,
    Wave: 3,
    ThumbsUp: 3
  }
  public isRunmode = false;
  private epsilon = 0.0000001;
  private isLocked = false;
  constructor(gltf: GLTF) {
    this.mixer = new AnimationMixer(gltf.scene);
    const states = ['Idle', 'Walking', 'Running', 'Dance', 'Death', 'Sitting', 'Standing'];
    const emotes = ['Jump', 'Yes', 'No', 'Wave', 'Punch', 'ThumbsUp'];
    gltf.animations.forEach(animation => {
      const { name } = animation;
      const action = this.mixer.clipAction(animation);
      this.actions[name] = action;
      if (emotes.indexOf(name) >= 0 || states.indexOf(name) >= 4) {
        action.clampWhenFinished = true;
        action.loop = LoopOnce;
      }
    });
    this.animate(this.actions['Idle'],2);
  }
  private animate = (action: AnimationAction,priority:number) => {
    if((this.current===action && priority===2) || this.isLocked){
      return;
    }

    if(priority===1){ // ensure animation 
      this.isLocked = true;
      setTimeout(() => {
        this.isLocked = false;
      }, this.duration / 2 * 1000);
      this.current?.stop();
    }else{
      this.current?.fadeOut(this.duration);
    }

    this.current = action;
    this.currentPriority = priority;
    this.current
      ?.reset()
      .setEffectiveTimeScale(1)
      .setEffectiveWeight(1)
      .fadeIn(this.duration / 10)
      .play();
  }
  // check the latest key
  // 1. if not found in actionTable, animation decided ty velocity
  // compare the priority with the current action
  // 2. if it is priority 3, enable when current action is idle
  // 3. other cases skip when higher, replace when equal or lower(the smaller number, the higher priority)
  public update = (time: number, key: string, velocity: number) => {  
    const isMoving = this.currentPriority === 2;
    const isTurning = key===KeycodePhysics.TurnLeft || key=== KeycodePhysics.TurnRight;
    if(key){
      const name = this.actionTable[key];
      if (!name) {
        if (velocity < this.epsilon && !isTurning) {
          this.animate(this.actions['Idle'],2);
        } else {
          this.animate(this.actions[this.isRunmode ? 'Running' : 'Walking'],2);
        }
      } else if (this.priority[name] === 3 && this.current === this.actions['Idle']) {
        this.animate(this.actions[name],this.priority[name]);
      } else if (this.priority[name] <= this.currentPriority) {
        this.animate(this.actions[name],this.priority[name]);
      }
    }
    else if(isMoving){
      if (velocity < this.epsilon) {
        this.animate(this.actions['Idle'],2);
      } else {
        this.animate(this.actions[this.isRunmode ? 'Running' : 'Walking'],2);
      }
    }
    this.mixer.update(time);
  }
}