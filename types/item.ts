export type TAffix = {
  name: string;
  value: number;
};

export type TStat = {
  name: string;
  value: string;
};

export type TInventorySize = {
  x: number;
  y: number;
};

export type TRequirement = {
  attribute: "strength" | "dexterity" | "vitality" | "mana" | "level";
  value: number;
};

export default interface IItem {
  name: string;
  itemStats: Array<TStat>;
  durability: number;
  inventorySize: TInventorySize;
  ilvl?: number;
  set?: string;
  affixes?: Array<TAffix>;
  requirements?: Array<TRequirement> | null;
  spellsImpacted?: Array<string>;
}
