import {
  Application,
  Router,
  RouterContext,
} from "https://deno.land/x/oak@v6.2.0/mod.ts";

import { applyGraphQL } from "https://deno.land/x/oak_graphql/mod.ts";

import types from "./types/types.graphql.ts";
import Item, { TAffix, TInventorySize, TRequirement } from "./types/item.ts";

//Data
const items = JSON.parse(Deno.readTextFileSync("items.json")) as Array<Item>;

const app = new Application();

const resolvers = {
  Query: {
    item: (
      _parent: unknown,
      { name }: { name: string },
      _context: unknown,
      _info: unknown
    ) => {
      if (name) {
        return items.filter((item) => {
          return item.name.toLowerCase() === name.toLowerCase();
        })[0];
      } else return null;
    },
    items: (
      _parent: unknown,
      { name }: { name: string },
      _context: unknown,
      _info: unknown
    ) => {
      if (name) {
        return items.filter((item) => {
          return item.name.toLowerCase().includes(name.toLowerCase());
        });
      } else return items;
    },
  },
};

const GraphQLService = await applyGraphQL<Router>({
  Router,
  typeDefs: types,
  resolvers: resolvers,
  context: (ctx: RouterContext) => {
    /** Handle authorisation in context */
    console.log("ctx", ctx);
    return {
      user: "Praveen",
    };
  },
});

app.use(GraphQLService.routes(), GraphQLService.allowedMethods());

console.log("server start at http://localhost:8090");
await app.listen({ port: 8090 });
