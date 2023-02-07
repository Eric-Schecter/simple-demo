import { Model, Selection, Render } from "../../types";
import { Options } from "./types";

export const options:Options = {
  model:{
    folderName:'Model',
    settings: {
      'Robot': true,
      'Chair': false,
      'Gear': false,
      'Workpiece': false
    },
    values: {
      'Robot': Model.ROBOT,
      'Chair': Model.CHAIR,
      'Gear': Model.GEAR,
      'Workpiece': Model.WORKPIECE,
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
      'Wireframe+Shader': false,
    },
    values: {
      'Standard': Render.STD,
      'Wireframe': Render.WIRE,
      'Wireframe+Shader': Render.WIREShader,
    }
  }
}