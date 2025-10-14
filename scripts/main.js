const MOD_ID = "mythborn-starsign";
const FLAG_KEY = "value";
const DEFAULT_TABLE = "The Constellations of the Mythborn";

Hooks.once("init", function() {
    CONFIG.debug.hooks = true;
});

/** Settings */
Hooks.once("init", () => {
  console.log("mythborn-starsigns init")
  game.settings.register(MOD_ID, "autoAssign", {
    name: "Auto-assign on character creation",
    hint: "If enabled, new PF2e characters will automatically roll a starsign once.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MOD_ID, "tableName", {
    name: "RollTable name",
    hint: "The name of the rollable table to draw the Starsign from.",
    scope: "world",
    config: true,
    type: String,
    default: DEFAULT_TABLE
  });

  game.settings.register(MOD_ID, "compendiumTables", {
    name: "Also search compendia for the table",
    hint: "If not found in world tables, also search any RollTable compendia.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

/** Helper: find RollTable by name (world first, then compendia if enabled) */
async function findTableByName(name) {
  console.log("findTableByName", name)
  // World tables
  const world = game.tables?.getName?.(name) ?? game.tables?.find(t => t.name === name);
  if (world) return world;

  // Compendia
  if (!game.settings.get(MOD_ID, "compendiumTables")) return null;
  const packs = game.packs?.filter(p => p.documentName === "RollTable") ?? [];
  for (const pack of packs) {
    try {
      const index = await pack.getIndex();
      const hit = index.find(e => e.name === name);
      if (hit) return await pack.getDocument(hit._id);
    } catch (err) {
      console.warn(`[${MOD_ID}] Failed reading pack ${pack.collection}:`, err);
    }
  }
  return null;
}

/** Helper: draw one result as plain text */
async function drawStarsignText(tableName) {
  console.log("drawStarsignText", tableName)
  const table = await findTableByName(tableName);
  if (!table) {
    ui.notifications?.error?.(`[${MOD_ID}] RollTable "${tableName}" not found.`);
    return null;
  }
  // Foundry v10+ draw API; don't spam chat
  const draw = await table.draw({ displayChat: false });
  // Prefer result text; fallback to document reference label
  const result = draw?.results?.[0];
  if (!result) return null;

  // If the table result has text, use it. If it links to a Document, use its name.
  return result.text?.trim() || result.documentCollection ? (await result.getDocument())?.name : null;
}

/** Assign once on creation (PCs only) */
Hooks.on("preCreateActor", async (actor, data, options, userId) => {
  console.log("preCreateActor", actor, data)
  try {
    if (!game.settings.get(MOD_ID, "autoAssign")) return;
    // Only run for character actors (PF2e PCs are type "character")
    const type = data?.type ?? actor?.type;
    if (type !== "character") return;
    // GM or creator only
    if (game.userId !== userId) return;

    // Avoid rerolls if a value was provided by an importer/template
    const existing = foundry.utils.getProperty(data, `flags.${MOD_ID}.${FLAG_KEY}`) ??
                     actor.getFlag?.(MOD_ID, FLAG_KEY);
    if (existing) return;

    const tableName = game.settings.get(MOD_ID, "tableName") || DEFAULT_TABLE;
    const starsign = await drawStarsignText(tableName);
    if (!starsign) return;

    // Put it directly into the creating document so it is saved in the first commit
    actor.updateSource?.({ [`flags.${MOD_ID}.${FLAG_KEY}`]: starsign });
  } catch (err) {
    console.error(`[${MOD_ID}] preCreateActor error:`, err);
  }
});

/** Sheet injection: show a read-only “Starsign” row near the top of PF2e character sheets */
Hooks.on("renderActorSheet", async (sheet, html) => {
  console.log("renderActorSheet", sheet)
  try {
    const actor = sheet.actor;
    if (actor?.type !== "character") return;

    const starsign = actor.getFlag(MOD_ID, FLAG_KEY);
    // Render area: PF2e sheets have a header section; we’ll add a small pill below the name line.
    const header = html.find(".sheet-header");
    if (!header.length) return;

    // Avoid duplicate injection on re-render
    if (html.find(`.${MOD_ID}-starsign`).length) return;

    const val = starsign ? foundry.utils.escapeHTML(starsign) : "<em>Unassigned</em>";
    const block = $(`
      <div class="${MOD_ID}-starsign">
        <label>Starsign</label>
        <span class="value">${val}</span>
      </div>
    `);

    // Insert right after the header title or portrait area
    header.append(block);

    // Optional: GM-only reroll button (hidden if value exists to enforce “once” rule)
    if (!starsign && game.user?.isGM) {
      const reroll = $(`<button type="button" class="${MOD_ID}-assign">Assign Now</button>`)
        .on("click", async () => {
          const tableName = game.settings.get(MOD_ID, "tableName") || DEFAULT_TABLE;
          const txt = await drawStarsignText(tableName);
          if (!txt) return;
          await actor.setFlag(MOD_ID, FLAG_KEY, txt);
          ui.notifications?.info?.(`Starsign set to ${txt}`);
          sheet.render(true);
        });
      block.append(reroll);
    }

  } catch (err) {
    console.error(`[${MOD_ID}] renderActorSheet error:`, err);
  }
});
