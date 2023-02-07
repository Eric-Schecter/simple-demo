import { Group, Vector3 } from "three";
import { KeycodePhysics } from "./types";

export class PhysicsSystem {
  private activeKeys: string[] = [];
  private up = new Vector3(0, 1, 0);
  private rotateRate = 0.01;
  public force = 0.005;
  public velocity: Vector3;
  private actionTable: { [key: string]: () => void };
  constructor(private scene: Group) {
    this.actionTable = {
      [KeycodePhysics.TurnLeft]: this.turnLeft,
      [KeycodePhysics.TurnRight]: this.turnRight,
      [KeycodePhysics.MoveForward]: this.moveForward,
    };
    this.velocity = new Vector3(0, 0, 0);
  }
  private turnLeft = () => {
    this.scene.rotateOnAxis(this.up, this.rotateRate);
  }
  private turnRight = () => {
    this.scene.rotateOnAxis(this.up, -this.rotateRate);
  }
  private moveForward = () => {
    this.velocity.set(0, 0, this.force);
    this.velocity.applyQuaternion(this.scene.quaternion);
    this.scene.position.add(this.velocity);
  }
  public register = (key: string) => {
    this.activeKeys.push(key);
  }
  public unregister = (key: string) => {
    for (let i = 0; i < this.activeKeys.length; i++) {
      if (key === this.activeKeys[i]) {
        this.activeKeys.splice(i, 1);
        break;
      }
    }
  }
  public update = () => {
    this.velocity.set(0, 0, 0);
    this.activeKeys.forEach(activeKey => {
      if (this.actionTable[activeKey]) {
        this.actionTable[activeKey]();
      }
    })
  }
  public get currentKey() {
    return this.activeKeys[this.activeKeys.length - 1];
  }
}