/*
  Mythborn Starsigns (PF2e, Foundry core v13)
  - On character creation, draws from the RollTable named "The Constellations of the Mythborn"
    and stores the result in actor flag: flags["mythborn-starsigns"].starsign
  - Injects a visible read-only field at the top of PF2e Character sheets
  - Provides a small reroll button (GM only) and a right-click context to copy/reset
*/
[]
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
        <span class="value starsign-clickable" title="Click to announce Starsign">${starsign.name}</span>
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

  // === Click handler for announcing starsign ===
  $field.find(".starsign-clickable").on("click", function(event) {
    event.preventDefault();
    
    // Clean up tooltip if it's visible
    const $tooltip = $(this).data("starsignTooltip");
    if ($tooltip) {
      $tooltip.remove();
      $(document).off("mousemove.starsigntip");
      $(this).removeData("starsignTooltip");
    }
    
    announceStarsign(actor, starsign);
  });

  // Find the details grid container shown in your screenshot
  const $grid = html.find(".tab.character .subsection.details .abcd").first();
  if (!$grid.length) return; // container not found; bail quietly

  // Place Starsign as a sibling right after Class (so it sits to the below Background per grid flow)
  const $deity = $grid.find(".detail.class").first();
  if ($deity.length) $deity.after($field);
  else $grid.append($field); // fallback

  bindStarsignPick(html, actor);
});

// === Cleanup tooltips when sheet is closed ===
Hooks.on("closeActorSheet", (app, html) => {
  // Remove any lingering starsign tooltips
  $(".starsign-tooltip").remove();
  $(document).off("mousemove.starsigntip");
});

/** Map starsign names to effect slugs */
function getConditionSlugForStarsign(starsignName) {
  const mapping = {
    "The Wolf Twins": "starsign-wolf-twins",
    "The Stone Father": "starsign-stone-father",
    "The Verdant Crown": "starsign-verdant-crown",
    "The Silent Moon": "starsign-silent-moon",
    "The Shadow's Edge": "starsign-shadows-edge",
    "The Stormbreaker": "starsign-stormbreaker",
    "The Crystal Bloom": "starsign-crystal-bloom",
    "The Seraphic Flame": "starsign-seraphic-flame",
    "The Wandering Star": "starsign-wandering-star"
  };
  return mapping[starsignName] || null;
}

/** Post a chat message announcing the Starsign activation and apply effect */
async function announceStarsign(actor, starsign) {
  if (!starsign || !starsign.name) {
    return ui.notifications.warn("No Starsign to announce.");
  }

  // Build the chat message content with image and description
  const content = `
    <div class="starsign-announcement">
      <h3 style="margin-top: 0; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 0.5em;">
        <strong>${actor.name}</strong> activates their Starsign!
      </h3>
      <div style="display: flex; gap: 1em; align-items: flex-start;">
        ${starsign.img ? `<img src="${starsign.img}" style="width: 64px; height: 64px; border-radius: 4px; flex-shrink: 0; border: 1px solid rgba(0,0,0,0.2);" />` : ""}
        <div style="flex: 1;">
          <h4 style="margin: 0 0 0.5em 0; color: var(--color-text-dark-primary, #191813);">
            ${starsign.name}
          </h4>
          <p style="margin: 0; font-size: 0.9em;">
            ${starsign.description || "<em>No description available.</em>"}
          </p>
        </div>
      </div>
    </div>
  `;

  await ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: content,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER
  });

  // Apply the corresponding effect to the actor
  await applyStarsignEffect(actor, starsign);
}

/** Apply the starsign effect to the actor */
async function applyStarsignEffect(actor, starsign) {
  try {
    const effectSlug = getConditionSlugForStarsign(starsign.name);
    if (!effectSlug) {
      console.warn(`${MODULE_ID} | No effect slug found for starsign: ${starsign.name}`);
      return;
    }

    // Check if the actor already has this effect
    const existingEffect = actor.itemTypes.effect?.find(c => c.slug === effectSlug);
    if (existingEffect) {
      ui.notifications.info(`${starsign.name} effect is already active.`);
      return;
    }

    // Get the effect from the compendium
    const pack = game.packs.get(`${MODULE_ID}.starsign-effects`);
    if (!pack) {
      console.error(`${MODULE_ID} | Effect compendium not found. Make sure the module is properly installed.`);
      ui.notifications.error("Starsign effect compendium not found. Please reload Foundry.");
      return;
    }

    // Ensure the index is loaded and find the effect by name
    await pack.getIndex({ fields: ["name", "type", "img"] });
    const effectEntry = pack.index.find(entry => entry.name === starsign.name);

    if (!effectEntry) {
      console.warn(`${MODULE_ID} | Effect not found in compendium for: ${starsign.name}`);
      ui.notifications.warn(`Effect for ${starsign.name} not found in compendium.`);
      return;
    }

    // Get the full effect document
    const effectDoc = await pack.getDocument(effectEntry._id);
    if (!effectDoc) {
      console.error(`${MODULE_ID} | Failed to load effect document for: ${starsign.name}`);
      return;
    }

    // Create the effect on the actor
    const effectData = effectDoc.toObject();
    await actor.createEmbeddedDocuments("Item", [effectData]);

    ui.notifications.info(`${starsign.name} effect applied to ${actor.name}.`);
  } catch (error) {
    console.error(`${MODULE_ID} | Error applying effect:`, error);
    ui.notifications.error("Failed to apply starsign effect.");
  }
}

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
