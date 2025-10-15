/*
  Mythborn Starsigns (PF2e, Foundry core v13)
  - On character creation, draws from the RollTable named "The Constellations of the Mythborn"
    and stores the result in actor flag: flags["mythborn-starsigns"].starsign
  - Injects a visible read-only field at the top of PF2e Character sheets
  - Provides a small reroll button (GM only) and a right-click context to copy/reset
*/

const MODULE_ID = "mythborn-starsigns";
const TABLE_NAME = "The Constellations of the Mythborn";

Hooks.on("createActor", async (actor, options, userId) => {
  try {
    if (actor.type !== "character") return;
    const table = game.tables?.getName?.(TABLE_NAME);
    if (!table) return;

    const draw = await table.draw({ displayChat: false });
    const starsign = draw?.results?.[0] ?? null;
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

  const starsign = actor.getFlag(MODULE_ID, "starsign") ?? "—";

  // Already added?
  if (html.find(".detail.starsign").length) return;
  console.log(`${MODULE_ID} | renderActorSheet`, starsign)
  // Build a PF2e detail block (label above input)
  // <div class="starsign-emblem"><img src="${starsign.img}"></div>
  const $field = $(`
    <div class="detail starsign">
      <span class="details-label">Starsign</span>
      <h3>
        <span class="value">${starsign.name}</span>
        ${game.user.isGM ? `<a class="starsign-pick" title="Pick Starsign"><i class="fa-solid fa-fw fa-ellipsis-v"></i></a>` : ""}
      </h3>
    </div>
  `);
  // === Hover tooltip ===
  $field.hover(
    function (event) {
      // Create tooltip container
      const $tooltip = $(`
        <div class="starsign-tooltip">
          ${starsign.img ? `<img src="${starsign.img}" class="starsign-img" />` : ""}
          <div class="starsign-tooltip-text">
            <strong>${starsign.name}</strong><br>
            <span>${starsign.description ?? ""}</span>
          </div>
        </div>
      `);

      $("body").append($tooltip);

      // Position near cursor
      const moveTooltip = (ev) => {
        $tooltip.css({
          left: ev.pageX + 15,
          top: ev.pageY + 15
        });
      };

      moveTooltip(event);
      $(document).on("mousemove.starsigntip", moveTooltip);

      // Save ref to tooltip for cleanup
      $(this).data("starsignTooltip", $tooltip);
    },
    function () {
      // Cleanup on mouseleave
      const $tooltip = $(this).data("starsignTooltip");
      if ($tooltip) $tooltip.remove();
      $(document).off("mousemove.starsigntip");
    }
  );
  // Find the details grid container shown in your screenshot
  const $grid = html.find(".tab.character .subsection.details .abcd").first();
  if (!$grid.length) return; // container not found; bail quietly

  // Place Starsign as a sibling right after Class (so it sits to the below Background per grid flow)
  const $deity = $grid.find(".detail.class").first();
  if ($deity.length) $deity.after($field);
  else $grid.append($field); // fallback

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
      const raw = r.name ?? "";
      return foundry.utils.stripHTML?.(raw) ?? raw;
    })
    .filter(Boolean);
}

function getStarsignByName(name) {
  const table = game.tables.getName?.(TABLE_NAME);
  if (!table) {
    console.warn(`RollTable "${TABLE_NAME}" not found.`);
    return null;
  }

  // Foundry v13: RollTable.results.contents is an array of TableResult documents
  for (const result of table.results.contents) {
    const next = result.name;
    if (name === next) {
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
          const starsign = getStarsignByName(value)
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
