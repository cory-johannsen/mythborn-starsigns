/**
 * Starsign Badge Management
 * Handles interactive badge functionality for starsign effects
 */

const MODULE_ID = "mythborn-starsigns";

/**
 * Get the starsign effect from an actor
 * @param {Actor} actor - The actor to search
 * @returns {Item|null} The starsign effect item or null
 */
function getStarsignEffect(actor) {
  if (!actor || !actor.itemTypes?.effect) return null;
  return actor.itemTypes.effect.find(e => e.slug?.startsWith("starsign-")) ?? null;
}

/**
 * Get remaining uses from a starsign effect
 * @param {Item} effect - The effect item
 * @returns {number} The number of uses remaining
 */
function getRemainingUses(effect) {
  if (!effect) return 0;
  return effect.system.badge?.value ?? 0;
}

/**
 * Decrement the use counter on a starsign effect
 * @param {Actor} actor - The actor who owns the effect
 * @param {Item} effect - The starsign effect
 */
async function decrementUse(actor, effect) {
  if (!effect || !actor) return;
  
  const current = effect.system.badge?.value ?? 0;
  if (current <= 0) {
    ui.notifications.warn("No uses remaining for this starsign power.");
    return;
  }
  
  const newValue = current - 1;
  
  // Update the badge value and token icon visibility
  await effect.update({ 
    "system.badge.value": newValue,
    "system.tokenIcon.show": newValue > 0
  });
  
  // Post chat message announcing activation
  const content = `
    <div class="starsign-activation">
      <p><strong>${actor.name}</strong> activates the power of <strong>${effect.name}</strong>!</p>
    </div>
  `;
  
  await ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: content,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER
  });
  
  // Notify when exhausted
  if (newValue === 0) {
    ui.notifications.info(`${effect.name} power exhausted for the day.`);
  }
}

/**
 * Reset daily uses for a starsign effect
 * @param {Actor} actor - The actor who owns the effect
 */
async function resetDailyUses(actor) {
  if (!actor) return;
  
  const starsignEffect = getStarsignEffect(actor);
  if (!starsignEffect) return;
  
  const maxUses = starsignEffect.system.badge?.max ?? 1;
  const currentUses = starsignEffect.system.badge?.value ?? 0;
  
  // Only reset if uses are below max
  if (currentUses < maxUses) {
    await starsignEffect.update({
      "system.badge.value": maxUses,
      "system.tokenIcon.show": true
    });
    
    ui.notifications.info(`${starsignEffect.name} power restored!`);
  }
}

/**
 * Update badge visibility based on remaining uses
 * @param {Item} effect - The starsign effect
 */
async function updateBadgeVisibility(effect) {
  if (!effect) return;
  
  const uses = getRemainingUses(effect);
  const shouldShow = uses > 0;
  
  // Only update if different from current state
  if (effect.system.tokenIcon?.show !== shouldShow) {
    await effect.update({
      "system.tokenIcon.show": shouldShow
    });
  }
}

// Export functions for use in other modules
window.StarsignBadge = {
  getStarsignEffect,
  getRemainingUses,
  decrementUse,
  resetDailyUses,
  updateBadgeVisibility
};

console.log(`${MODULE_ID} | Badge management module loaded`);

