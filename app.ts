import { existsSync } from "https://deno.land/std/fs/mod.ts";
import { crawlCategoryUrls } from "./crawlUrls.ts";

import { crawlItemPage } from "./items.ts";

import IItem from "./types/item.ts";
async function app() {
  try {
    let urls: string[];
    // create/read list of urls to crawl
    if (existsSync("urls.json")) {
      const file = Deno.readTextFileSync("urls.json");
      urls = JSON.parse(file);
    } else {
      urls = await crawlCategoryUrls();
    }

    const items: Array<IItem | null> = [];

    const asyncItems = urls.map((url) => {
      return crawlItemPage("https://diablo2.diablowiki.net", url);
    });

    await Promise.all(asyncItems).then((item) => {
      item.forEach((i) => {
        if (i) {
          items.push(i);
        }
      });
    });
    Deno.writeTextFileSync("items.json", JSON.stringify(items), {
      create: true,
    });

    // This works but not the general one
    // const item: IItem | null = await crawlItemPage(
    //   "https://diablo2.diablowiki.net",
    //   "/Hwanin's_Refuge"
    // );
    // console.log("item", item);
  } catch (error) {
    console.log(error);
  }
}

app();

export {};
