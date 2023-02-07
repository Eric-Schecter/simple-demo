import { Model, Selection, Render } from "../../types";
import { Options } from "./types";

export const options:Options = {
  model:{
    folderName:'Model',
    settings: {
      'Robot': true,
      'Chair': false,
      'Geer': false,
      'Workpiece': false
    },
    values: {
      'Robot': Model.ANIMATION,
      'Chair': Model.GLB,
      'Geer': Model.STL,
      'Workpiece': Model.STP,
    },
  },
  selectionMode:{
    folderName:'Selection Mode',
    settings: {
      'Mesh': true,
      'Face': false,
      'Line': false,
      'Point': false
    },
    values: {
      'Mesh': Selection.MESH,
      'Face': Selection.FACE,
      'Line': Selection.LINE,
      'Point': Selection.POINT,
    }
  },
  renderMode:{
    folderName:'Render Mode',
    settings: {
      'Standard': true,
      'Wireframe': false,
    },
    values: {
      'Standard': Render.STD,
      'Wireframe': Render.WIRE,
      'Wireframe+Shader': Render.WIREShader,
    }
  }
}