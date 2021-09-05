import {
  DOMParser,
  Element,
  Text,
} from "https://deno.land/x/deno_dom@v0.1.12-alpha/deno-dom-wasm.ts";

import { exists } from "https://deno.land/std/fs/mod.ts";

import { fetchHTML } from "../util.ts";

import IItem, { TStat, TInventorySize, TRequirement } from "../types/item.ts";

export async function crawlAllSetItems(): Promise<Array<IItem>> {
  const html = await fetchHTML(
    "https://diablo2.diablowiki.net",
    "/Category:Set_Items",
    "setitemsurls"
  );

  const doc = new DOMParser().parseFromString(html, "text/html");

  const linkTags = doc?.querySelector("#mw-pages")?.querySelectorAll("a");

  const linksArray = linkTags ? [...linkTags] : [];

  const sets = linksArray.map((link) => {
    if (link.nodeType === 1) {
      return {
        href: (link as Element).attributes.getNamedItem("href").value,
        name: link.textContent,
      };
    }
  });

  const items = await sets.reduce(async (acc, set) => {
    const accum = await acc;

    if (set?.href && set.name) {
      const setItems = await crawlSetPage(
        "https://diablo2.diablowiki.net",
        set?.href,
        set?.name
      );

      return [...accum, ...setItems];
    }

    return accum;
  }, Promise.resolve([] as Array<IItem>));

  console.log("links", sets);

  return items;
}

export async function crawlSetPage(
  host: string,
  suburl: string,
  setName: string
): Promise<Array<IItem>> {
  const html = await fetchHTML(host, suburl, setName);

  const doc = new DOMParser().parseFromString(html, "text/html");

  const tableTags = doc?.querySelectorAll("tbody");

  const tableArray = tableTags
    ? [...tableTags].filter((table) => {
        const boldTags = table.children.item(0).querySelectorAll("b");
        const boldTagArray = boldTags ? [...boldTags] : [];
        return (
          boldTagArray.filter((boldtag) =>
            boldtag.textContent.toLowerCase().includes("part of")
          ).length > 0
        );
      })
    : [];

  const items = tableArray.map((table) => {
    const tableRow = (table as Element).querySelector("tr");
    if (tableRow) {
      return readItem(tableRow);
    }
  });

  return [];
}

function readItem(rowElement: Element): IItem | null {
  const tdTags = rowElement.querySelectorAll("td");
  const tdArray = tdTags ? [...tdTags] : [];
  if (tdArray.length > 0) {
    const [itemTd, propertiesTd, affixesTd] = tdArray;
    const item: IItem = {
      name: "",
      itemStats: [],
      durability: -1,
      inventorySize: {
        x: 1,
        y: 1,
      },
    };

    const { name, ilvl } = readItemColumn(itemTd as Element);
    const { itemStats, durability, inventorySize, requirements, usableBy } =
      readPropertiesColumn(propertiesTd as Element);

    const tempItem: IItem = {
      name,
      ilvl,
      itemStats,
      durability,
      inventorySize,
      requirements,
      usableBy,
    };

    console.log("item", tempItem);

    return item;
  } else {
    return null;
  }
}

function getItemKeyValue(item: string): { key: string; value: string } | null {
  function getStatValue(value: string, delimiter: number): string {
    const newLine = value.indexOf("\n");

    if (newLine !== -1) {
      return value.substr(delimiter + 1, newLine - delimiter - 1);
    } else {
      return value.substr(delimiter + 1);
    }
  }
  const delimiter = item.indexOf(":");
  if (delimiter === -1) {
    return null;
  }

  const key = item.substr(0, delimiter).toLowerCase().trim();
  const value = getStatValue(item, delimiter).toLowerCase().trim();

  return { key: key, value: value };
}
function getListItems(element: Element): Array<string> {
  const listItems = element.querySelectorAll("li");

  return listItems ? [...listItems].map((item) => item.textContent) : [];
}

function readItemColumn(columnElement: Element): {
  name: string;
  ilvl: number;
} {
  const name = columnElement.querySelector("b")?.textContent;

  const ilvlString = columnElement.querySelector("a[title='Item level']")
    ?.parentElement?.textContent;
  const ilvl = ilvlString
    ? parseInt(ilvlString.substr(ilvlString.indexOf(":") + 1))
    : 0;

  return { name: name ? name : "", ilvl };
}

/** Read Properties column */
function readPropertiesColumn(columnElement: Element): {
  itemStats: Array<TStat>;
  durability: number;
  inventorySize: TInventorySize;
  requirements?: Array<TRequirement>;
  usableBy?: string;
} {
  const ddTags = columnElement.querySelectorAll("dd");
  const lists = ddTags ? [...ddTags] : [];
  if (lists.length === 3) {
    const itemStats = readItemStats(lists.at(0) as Element);
    const { durability, inventorySize } = readUtilityStats(
      lists.at(1) as Element
    );
    const { requirements, usableBy } = readRequirements(lists.at(2) as Element);

    return {
      itemStats,
      durability,
      inventorySize,
      requirements,
      usableBy,
    };
  }

  return {
    itemStats: [],
    durability: 0,
    inventorySize: {
      x: 0,
      y: 0,
    },
    requirements: [],
    usableBy: "all",
  };
}
function readItemStats(descriptionTag: Element): Array<TStat> {
  const listItemArray = getListItems(descriptionTag)
    .map((string) => getItemKeyValue(string))
    .filter((item) => item);

  const statArray = listItemArray.map((item): TStat => {
    return {
      name: item?.key ? item.key : "",
      value: item?.value ? item.value : "",
    };
  });

  return statArray;
}
function readUtilityStats(descriptionTag: Element): {
  durability: number;
  inventorySize: TInventorySize;
} {
  const listItemArray = getListItems(descriptionTag).map((string) =>
    getItemKeyValue(string)
  );

  return listItemArray.reduce(
    (acc, item) => {
      if (item) {
        if (item.key === "durability") {
          const durability = parseInt(item.value);
          if (!isNaN(durability)) {
            acc = { ...acc, durability: durability };
          } else if (item.value === "indestructible") {
            acc = { ...acc, durability: -1 };
          }
        }

        if (item.key === "inv size") {
          const delimiter = item.value.indexOf("x");
          const x = parseInt(item.value.substr(0, delimiter).trim());
          const y = parseInt(item.value.substr(delimiter + 1).trim());

          acc = { ...acc, inventorySize: { x: x, y: y } };
        }
      }

      return acc;
    },
    {
      // 0 durability is invalid so we will filter by that
      durability: 0,
      inventorySize: {
        // Items cannot be 0 in size, so we use this as filter
        x: 0,
        y: 0,
      },
    }
  );
}

function readRequirements(descriptionTag: Element): {
  requirements: Array<TRequirement>;
  usableBy: string;
} {
  const listItemArray = getListItems(descriptionTag)
    .map((string) => getItemKeyValue(string))
    .filter((item) => item);

  let usableBy = "all";

  const requirements = listItemArray
    .map((item) => {
      if (item?.value && item.key) {
        const attribute = item.key.replace("required", "");
        switch (attribute) {
          case "usable by":
            usableBy = item.value;
            return null;
          case "strength":
          case "dexterity":
          case "vitality":
          case "mana":
          case "level":
            return { attribute: attribute, value: parseInt(item.value) };
          default:
            return null;
        }
      }
      return null;
    })
    .filter((item) => item !== null);
  return {
    requirements: requirements as Array<TRequirement>,
    usableBy: usableBy,
  };
}

// End of properties column
