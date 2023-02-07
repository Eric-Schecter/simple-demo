import { AmbientLight, Group, Scene, SpotLight, Vector2 } from "three";

export class LightSystem {
  constructor(private scene:Scene){
    this.initLights();
  }
  private initSpotLight = (x: number, y: number, z: number, intensity: number) => {
    const light = new SpotLight('white', intensity);
    light.penumbra = 1;
    light.position.set(x, y, z);
    light.lookAt(0, 0, 0);
    light.shadow.mapSize = new Vector2(1024, 1024);
    light.castShadow = true;
    return light;
  }
  // https://vimeo.com/blog/post/your-quick-and-dirty-guide-to-3-point-lighting
  private initLights = () => {
    const lights = new Group();
    const dis = 4;
    const keyLight = this.initSpotLight(-dis, dis, dis, 1);
    const fillLight = this.initSpotLight(dis, dis, dis, 0.5);
    const backLight = this.initSpotLight(-dis, dis, -dis, 0.2);
    const ambientLight = new AmbientLight('white', 0.1);
    lights.add(ambientLight, keyLight, fillLight, backLight);
    this.scene.add(lights);
  }
}