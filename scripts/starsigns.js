/*
  Mythborn Starsigns (PF2e, Foundry core v13)
  - On character creation, draws from the RollTable named "The Constellations of the Mythborn"
    and stores the result in actor flag: flags["mythborn-starsigns"].starsign
  - Injects a visible read-only field at the top of PF2e Character sheets
  - Provides a small reroll button (GM only) and a right-click context to copy/reset
*/

const MODULE_ID = "mythborn-starsigns";
const TABLE_NAME = "The Constellations of the Mythborn";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | init`);

  game.settings.register(MODULE_ID, "autoRerollIfMissing", {
    name: "Auto-assign Starsign if missing on open",
    hint: "If a character has no starsign set, automatically roll from the table when their sheet is opened (useful for migrated actors).",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

/**
 * Pre-create: assign a starsign from the rolltable to PF2e characters
 */
Hooks.on("preCreateActor", async (actor, createData, options, userId) => {
  try {
    if (actor.type !== "character") return; // PF2e PCs
    // Only do this once, and only if flag isn't already set by a compendium import, etc.
    const existing = getProperty(createData, `flags.${MODULE_ID}.starsign`);
    if (existing) return;

    const table = game.tables?.getName?.(TABLE_NAME);
    if (!table) {
      console.warn(`${MODULE_ID} | RollTable not found: ${TABLE_NAME}`);
      return;
    }

    const draw = await table.draw({ displayChat: false });
    const result = draw?.results?.[0];
    const starsignText = result?.text ?? result?.document?.text ?? result?.getChatText?.() ?? null;

    if (!starsignText) {
      console.warn(`${MODULE_ID} | No text found on table result.`);
      return;
    }

    // Store to flags on the source before creation
    actor.updateSource({ [`flags.${MODULE_ID}.starsign`]: starsignText.trim() });
  } catch (err) {
    console.error(`${MODULE_ID} | preCreateActor error`, err);
  }
});

/**
 * Inject Starsign UI into PF2e Character sheets
 */
Hooks.on("renderActorSheet", async (app, html, data) => {
  try {
    const actor = app.actor;
    if (!actor || actor.type !== "character") return;

    const starsign = actor.getFlag(MODULE_ID, "starsign");

    // Optionally autogenerate if missing (migration helper)
    if (!starsign && game.settings.get(MODULE_ID, "autoRerollIfMissing")) {
      await ensureStarsign(actor);
    }

    const value = actor.getFlag(MODULE_ID, "starsign") ?? "—";

    // Avoid duplicate injection
    if (html.find(`section.${MODULE_ID}-block`).length) return;

    const canEdit = game.user.isGM || actor.isOwner;

    const block = $(`
      <section class="${MODULE_ID}-block">
        <div class="starsign-label">Starsign</div>
        <div class="starsign-value" title="${value}">${escapeHtml(value)}</div>
        ${game.user.isGM ? `<button type="button" class="starsign-reroll" title="Reroll from '${TABLE_NAME}'">↺</button>` : ""}
      </section>
    `);

    // Insert near the top of the sheet body for visibility, but keep it generic
    const body = html.find(".sheet-body");
    if (body.length) body.prepend(block);
    else html.prepend(block);

    // Wire up reroll (GM only)
    block.find(".starsign-reroll").on("click", async (event) => {
      event.preventDefault();
      if (!game.user.isGM) return ui.notifications.warn("Only a GM can reroll Starsigns.");
      const table = game.tables?.getName?.(TABLE_NAME);
      if (!table) return ui.notifications.error(`RollTable not found: ${TABLE_NAME}`);
      const draw = await table.draw({ displayChat: true });
      const result = draw?.results?.[0];
      const text = result?.text ?? result?.document?.text ?? null;
      if (!text) return;
      await actor.setFlag(MODULE_ID, "starsign", text.trim());
      app.render(false);
    });

    // Context menu: copy/reset
    block.find(".starsign-value").on("contextmenu", async (event) => {
      event.preventDefault();
      const choice = await Dialog.wait({
        title: "Starsign",
        content: `
          <p><strong>${escapeHtml(value)}</strong></p>
          <p>Choose an action:</p>
        `,
        buttons: {
          copy: {
            icon: '<i class="fas fa-copy"></i>',
            label: "Copy to Clipboard",
            callback: async () => navigator.clipboard?.writeText?.(value)
          },
          reset: {
            icon: '<i class="fas fa-eraser"></i>',
            label: "Clear",
            callback: async () => {
              if (!canEdit) return;
              await actor.unsetFlag(MODULE_ID, "starsign");
              app.render(false);
            }
          },
          close: { label: "Close" }
        },
        default: "close"
      });
      return choice;
    });
  } catch (err) {
    console.error(`${MODULE_ID} | renderActorSheet error`, err);
  }
});

async function ensureStarsign(actor) {
  if (actor.getFlag(MODULE_ID, "starsign")) return;
  const table = game.tables?.getName?.(TABLE_NAME);
  if (!table) return;
  const draw = await table.draw({ displayChat: false });
  const result = draw?.results?.[0];
  const text = result?.text ?? result?.document?.text ?? null;
  if (!text) return;
  await actor.setFlag(MODULE_ID, "starsign", text.trim());
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
