import { exists } from "https://deno.land/std/fs/mod.ts";

export async function fetchHTML(
  host: string,
  suburl: string,
  filename: string
): Promise<string> {
  const trimmedFileName = filename.replaceAll(/[ :/()]/g, "");
  const fileExists = await exists(`cache/${trimmedFileName}.html`);
  if (!fileExists) {
    console.log(`File ${trimmedFileName}.html does not exist, creating...`);
    const res = await fetch(host + suburl);
    if (res.status !== 200) {
      return "";
    }
    const html = await res.text();
    await Deno.writeTextFile(`cache/${trimmedFileName}.html`, html, {
      create: true,
    });
    return html;
  }
  console.log(`File ${trimmedFileName}.html exists`);

  const html = Deno.readTextFile(`cache/${trimmedFileName}.html`);

  return html;
}
