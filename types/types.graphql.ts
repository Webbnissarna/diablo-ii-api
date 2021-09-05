import { gql } from "https://deno.land/x/oak_graphql@0.6.2/mod.ts";

export default gql`
  type Affix {
    name: String
    value: Int
  }
  type Stat {
    name: String
    value: String
  }

  type InventorySize {
    x: Int
    y: Int
  }

  type Requirement {
    attribute: String
    value: Int
  }

  type Item {
    name: String!
    inventorySize: InventorySize!
    itemStats: [Stat]!
    durability: Int!
    ilvl: Int
    set: String
    affixes: [Affix]
    requirements: [Requirement]
    spellsImpaced: [String]
  }

  type Query {
    item(name: String): Item
    items(name: String): [Item]
  }
`;
