import {
  DOMParser,
  Element,
  Text,
} from "https://deno.land/x/deno_dom@v0.1.12-alpha/deno-dom-wasm.ts";

import { exists } from "https://deno.land/std/fs/mod.ts";

import IItem, {
  TAffix,
  TInventorySize,
  TRequirement,
  TStat,
} from "./types/item.ts";

export type TCrawl = {
  queue: Set<string>;
  crawled: Set<string> | undefined;
};

export async function crawlCategory(
  host: string,
  suburl: string,
  crawled: Set<string> | undefined
): Promise<TCrawl | undefined> {
  try {
    const res = await fetch(host + suburl);
    const html = await res.text();

    const doc = new DOMParser().parseFromString(html, "text/html");
    crawled?.add(suburl);

    const queue = new Set<string>();

    const pages = doc?.querySelector("#mw-pages")?.querySelectorAll("a");
    /**
     * If we find a subcategory crawl through its links
     */
    pages?.forEach((link) => {
      // https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
      if (link.nodeType === 1) {
        const href = (link as Element).attributes.getNamedItem("href").value;
        if (!crawled?.has(href)) {
          queue.add(href);
        }
      }
    });

    return {
      queue: queue,
      crawled: crawled,
    };
  } catch (error) {
    console.log(error);
  }
}

/** Example page:  */

export async function crawlItemPage(
  host: string,
  suburl: string
): Promise<IItem | null> {
  try {
    const fileExists = await exists(`items/${suburl}`);
    if (!fileExists) {
      const res = await fetch(host + suburl);
      if (res.status === 200) {
        const html = await res.text();
        await Deno.writeTextFile(`items/${suburl}`, html, { create: true });
      }
    }
    const html = await Deno.readTextFile(`items/${suburl}`);

    const doc = new DOMParser().parseFromString(html, "text/html");

    const itemTable = doc
      ?.getElementsByTagName("tbody")
      .filter((table) => {
        const itemTables = table.getElementsByTagName("b").filter((boldTag) => {
          return boldTag.innerText
            .toLowerCase()
            .includes("diablo ii item info");
        });
        return itemTables.length > 0;
      })
      ?.at(0);
    if (itemTable === undefined || itemTable === null) {
      console.error("No table found for url: ", suburl);
      return null;
    }

    const [
      _header,
      imageRow,
      nameRow,
      itemStatsRow,
      affixesRow,
      utilityRow,
      requirementsRow,
    ] = itemTable.getElementsByTagName("tr");

    if (
      !nameRow ||
      !itemStatsRow ||
      !affixesRow ||
      !utilityRow ||
      !requirementsRow
    ) {
      /** Format on table could be different so this is troublesome */
      console.error("Could not find all seven rows", suburl);
      return null;
    }

    const item: IItem = {
      name: "default",
      itemStats: [],
      ilvl: 0,
      affixes: [],
      durability: 0,
      inventorySize: { x: 0, y: 0 },
    };
    item.name =
      nameRow.getElementsByTagName("b").at(0)?.innerText.trim() ?? "-";

    item.ilvl = getIlvl(nameRow);
    item.affixes = getAffixes(affixesRow);
    item.itemStats = getItemStats(itemStatsRow);

    const { durability, inventorySize } = getUtility(utilityRow);
    item.durability = durability;
    item.inventorySize = inventorySize;

    item.requirements = getRequirements(requirementsRow);

    return item;
  } catch (error) {
    console.error(error);
  }

  return null;
}

function getItemKeyValue(item: string): { key: string; value: string } {
  function getStatValue(value: string, delimiter: number): string {
    const newLine = value.indexOf("\n");

    if (newLine !== -1) {
      return value.substr(delimiter + 1, newLine - delimiter - 1);
    } else {
      return value.substr(delimiter + 1);
    }
  }
  const delimiter = item.indexOf(":");

  const key = item.substr(0, delimiter).trim();
  const value = getStatValue(item, delimiter).trim();

  return { key: key, value: value };
}

function getIlvl(rowElement: Element): number {
  const ilvlText = (
    rowElement
      .getElementsByTagName("a")
      .filter((tag) => tag.getAttribute("href") === "/Item_level")
      .at(0)
      ?.parentNode?.childNodes.item(1) as Text
  )?.data;

  return ilvlText
    ? parseInt(ilvlText.substr(ilvlText.indexOf(":") + 1).trim())
    : 0;
}

function getAffixes(rowElement: Element): Array<TAffix> {
  const listItems = rowElement
    .getElementsByTagName("li")
    .map((item) => item.innerText.trim());
  const affixes = listItems.map((affix) => {
    const value = affix.match(/\d+/)?.at(0);

    const aff: TAffix = {
      name: affix,
      value: value ? parseInt(value) : 0,
    };

    return aff;
  });
  return affixes;
}

function getItemStats(rowElement: Element): Array<TStat> {
  // Get all list items, filter out the ones that do not resemble a key/value pair
  const listItems = rowElement
    .getElementsByTagName("li")
    .filter((item) => item.innerText.includes(":"))
    .map((item) => item.innerText.trim());

  return listItems.map((item) => {
    const { key, value } = getItemKeyValue(item);

    const stat: TStat = { name: key, value: value };

    return stat;
  });
}

function getUtility(rowElement: Element): {
  durability: number;
  inventorySize: TInventorySize;
} {
  return rowElement.getElementsByTagName("li").reduce(
    (acc, item) => {
      const { key, value } = getItemKeyValue(item.innerText);

      if (key.toLowerCase().trim() === "durability") {
        const durability = parseInt(value);
        if (!isNaN(durability)) {
          acc = { ...acc, durability: durability };
        }
      }

      if (key.toLowerCase().trim() === "inv size") {
        const delimiter = value.indexOf("x");
        const x = parseInt(value.substr(0, delimiter).trim());
        const y = parseInt(value.substr(delimiter + 1).trim());

        acc = { ...acc, inventorySize: { x: x, y: y } };
      }

      return acc;
    },
    { durability: -1, inventorySize: { x: 1, y: 1 } }
  );
}

function getRequirements(rowElement: Element): Array<TRequirement> | null {
  const listItems = rowElement
    .getElementsByTagName("li")
    .map((item) => getItemKeyValue(item.innerText));

  const requirements: Array<TRequirement> = Array(0);

  if (listItems.length > 0) {
    listItems.forEach(({ key, value }) => {
      const attribute = key
        .toLowerCase()
        .trim()
        .substr(key.indexOf("Required") + 8);

      switch (attribute) {
        case "strength":
        case "dexterity":
        case "vitality":
        case "mana":
        case "level":
          requirements.push({ attribute: attribute, value: parseInt(value) });
          break;
        default:
          break;
      }
    });

    return requirements;
  }
  return null;
}
