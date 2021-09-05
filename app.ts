// import { existsSync } from "https://deno.land/std/fs/mod.ts";
// import { crawlCategoryUrls } from "./crawlUrls.ts";

// import { crawlItemPage } from "./items.ts";

import { crawlAllSetItems, crawlSetPage } from "./crawlers/setItems.ts";

async function app() {
  try {
    // const setItems = await crawlAllSetItems();
    crawlSetPage(
      "https://diablo2.diablowiki.net",
      "/Aldur's_Watchtower",
      "Aldur's Watchtower"
    );
    // console.log("set items: ", setItems);
    // let urls: string[];
    // // create/read list of urls to crawl
    // if (existsSync("urls.json")) {
    //   const file = await Deno.readTextFile("urls.json");
    //   urls = JSON.parse(file);
    // } else {
    //   urls = await crawlCategoryUrls();
    // }

    // const asyncItems = urls.map((url) => {
    //   return crawlItemPage("https://diablo2.diablowiki.net", url);
    // });

    // const items = (await Promise.all(asyncItems)).filter((i) => i !== null);

    // await Deno.writeTextFile("items.json", JSON.stringify(items), {
    //   create: true,
    // });

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
