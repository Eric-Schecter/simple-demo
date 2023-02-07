export type Option = {
  folderName:string,
  settings:{[prop:string]:boolean},
  values:{[prop:string]:number},
}

export type Options = {[prop:string]:Option}