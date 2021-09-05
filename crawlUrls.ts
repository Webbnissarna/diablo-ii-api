import { crawlCategory, TCrawl } from "./items.ts";

export async function crawlCategoryUrls() {
  const queue = new Set<string>(["/Category:Items"]);
  let crawled: Set<string> | undefined = new Set<string>();
  do {
    const crawler: TCrawl | undefined = await crawlCategory(
      "https://diablo2.diablowiki.net",
      queue.values().next().value,
      crawled
    );
    queue.delete(queue.values().next().value);
    crawled = crawler?.crawled;
    crawler?.queue.forEach((suburl) => {
      queue.add(suburl);
    });
  } while (queue.size > 0);

  let data = "[";
  crawled?.forEach((suburl) => {
    data += `"${suburl}", `;
  });
  data += "]";
  Deno.writeTextFileSync("urls.json", data, { create: true });
  return JSON.parse(data);
}

export async function crawlItemUrls(queue: Set<string>) {
  let crawled: Set<string> | undefined = new Set<string>();

  do {} while (queue.size > 0);
}
