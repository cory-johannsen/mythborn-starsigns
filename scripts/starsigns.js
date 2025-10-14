/*
  Mythborn Starsigns (PF2e, Foundry core v13)
  - On character creation, draws from the RollTable named "The Constellations of the Mythborn"
    and stores the result in actor flag: flags["mythborn-starsigns"].starsign
  - Injects a visible read-only field at the top of PF2e Character sheets
  - Provides a small reroll button (GM only) and a right-click context to copy/reset
*/

const MODULE_ID = "mythborn-starsigns";
const TABLE_NAME = "The Constellations of the Mythborn";

function debugLog(message) {
  console.log(`${MODULE_ID} | ${message}`)
}

function debugResult(name, result) {
  // Handle null/undefined
  if (!result) return;

  // Use a replacer to avoid circular refs and function clutter
  const seen = new WeakSet();
  const safeJson = JSON.stringify(result, (key, value) => {
    if (typeof value === "function") return "[Function]";
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
    }
    return value;
  }, 2);

  debugLog(` ${name}: ${safeJson}`)
}

Hooks.on("createActor", async (actor, options, userId) => {
  try {
    if (actor.type !== "character") return;
    const table = game.tables?.getName?.(TABLE_NAME);
    if (!table) return;

    const draw = await table.draw({ displayChat: false });
    const starsign = draw?.results?.[0] ?? null;
    console.log(`${MODULE_ID} | createActor selecting starsign`, starsign)
    if (!starsign) {
      console.warn(`${MODULE_ID} | No starsign found table result.`);
      return;
    }

    // ✅ Persist as a real flag on the newly created doc
    await actor.setFlag(MODULE_ID, "starsign", starsign);
  } catch (err) {
    console.error(`${MODULE_ID} | createActor`, err);
  }
});

Hooks.on("renderActorSheet", (app, html) => {
  const actor = app.actor;
  if (!actor || actor.type !== "character") return;

  console.log(`${MODULE_ID} | renderActorSheet actor`, actor)

  const starsign = actor.getFlag(MODULE_ID, "starsign") ?? "—";
  
  console.log(`${MODULE_ID} | renderActorSheet starsign`, starsign)

  // Already added?
  if (html.find(".detail.starsign").length) return;

  // Build a PF2e detail block (label above input)
  const $field = $(`
    <div class="detail starsign">
      <span class="details-label">Starsign</span>
      <h3>
        <span class="value">${starsign.name}</span>
        ${game.user.isGM ? `<a class="starsign-reroll" title="Reroll"><i class="fas fa-dice-d20"></i></a>` : ""}
         <a class="starsign-pick" title="Pick Starsign"><i class="fa-solid fa-list"></i></a>
      </h3>
    </div>
  `);

  // Find the details grid container shown in your screenshot
  const $grid = html.find(".tab.character .subsection.details .abcd").first();
  if (!$grid.length) return; // container not found; bail quietly

  // Place Starsign as a sibling right after Deity (so it sits to the right/below per grid flow)
  const $deity = $grid.find(".detail.deity").first();
  if ($deity.length) $deity.after($field);
  else $grid.append($field); // fallback

  // GM reroll handler
  $field.find(".starsign-reroll").on("click", async (ev) => {
    ev.preventDefault();
    const table = game.tables?.getName?.(TABLE_NAME);
    if (!table) return ui.notifications.error(`RollTable not found: ${TABLE_NAME}`);
    const draw = await table.draw({ displayChat: true });
    const starsign = draw?.results?.[0];
    if (!starsign) return;
    await actor.setFlag(MODULE_ID, "starsign", starsign);
    $field.find("value").val(starsign.name);
  });
  bindStarsignPick(html, actor);
});

async function ensureStarsign(actor) {
  if (actor.getFlag(MODULE_ID, "starsign")) return;
  const table = game.tables?.getName?.(TABLE_NAME);
  if (!table) return;
  const draw = await table.draw({ displayChat: false });
  const result = draw?.results?.[0];
  const text = result?.name ?? null;
  if (!text) return;
  await actor.setFlag(MODULE_ID, "starsign", text.trim());
}

function getStarsignOptions() {
  const table = game.tables.getName?.(TABLE_NAME);
  if (!table) return [];
  // PF2e v13: results are in results.contents; prefer clean text
  return table.results.contents
    .map(r => {
      const raw = r.name ?? r.getChatText?.() ?? "";
      return foundry.utils.stripHTML?.(raw) ?? raw;
    })
    .filter(Boolean);
}

function getStarsignByName(name) {
  console.log(`${MODULE_ID} | getStarsignByName name`, name)
  const table = game.tables.getName?.(TABLE_NAME);
  if (!table) {
    console.warn(`RollTable "${TABLE_NAME}" not found.`);
    return null;
  }

  // Foundry v13: RollTable.results.contents is an array of TableResult documents
  for (const result of table.results.contents) {
    const next = result.name;
    if (name === next) {
      console.log(`${MODULE_ID} | getStarsignByName found table entry`, result)
      return result;
    }
  }

  console.warn(`No Starsign named "${name}" found in RollTable "${TABLE_NAME}".`);
  return null;
}

/** Show a simple Dialog with a <select> of all Starsigns and set the flag. */
async function showStarsignPicker(actor) {
  const options = getStarsignOptions();
  if (!options.length) {
    return ui.notifications.warn(`RollTable "${TABLE_NAME}" not found or empty.`);
  }

  console.log(`${MODULE_ID} | showStarsignPicker options`, options)

  // Build the <select> HTML
  const opts = options
    .map(o => `<option value="${foundry.utils.escapeHTML(o)}">${foundry.utils.escapeHTML(o)}</option>`)
    .join("");
  const content = `
    <form class="flexcol">
      <div class="form-group">
        <label>Starsign</label>
        <select name="starsign">${opts}</select>
      </div>
    </form>`;

  new Dialog({
    title: "Pick Starsign",
    content,
    buttons: {
      set: {
        label: "Set",
        callback: html => {
          const value = html.find('[name="starsign"]').val();
          console.log(`${MODULE_ID} | showStarsignPicker callback value`, value)
          const starsign = getStarsignByName(value)
          console.log(`${MODULE_ID} | showStarsignPicker starsign`, starsign)
          return actor.setFlag(MODULE_ID, "starsign", starsign).then(() => {
            ui.notifications.info(`Starsign set to ${value}`);
          });
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "set"
  }).render(true);
}

/** Wire up the pick button during sheet render (same place you bind reroll). */
function bindStarsignPick(html, actor) {
  html.on("click", ".detail.starsign .starsign-pick", ev => {
    ev.preventDefault();
    if (!game.user.isGM) return ui.notifications.warn("Only GMs can set the Starsign.");
    showStarsignPicker(actor);
  });
}

function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}
