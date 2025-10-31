# Starsign Conditions

## Overview

When a player clicks on their Starsign to activate it, the module now:
1. Posts a public chat message announcing the activation
2. Applies a custom condition to the actor
3. The condition appears automatically on the actor's token with PF2e's condition system

## Features

### Automatic Token Indicators
- The PF2e system automatically displays condition icons on tokens
- Players and GMs can see active starsign conditions on character tokens
- Conditions appear in the token HUD (right-click the token)
- Conditions also appear in the character sheet's conditions section

### Manual Removal
- Conditions can be removed manually via the token HUD (right-click)
- Conditions can also be removed from the character sheet
- The `removable: true` flag ensures players can dismiss the condition when needed

### Preventing Duplicates
- The system checks if a starsign condition is already active
- If the condition exists, it shows a notification instead of adding a duplicate

## Implementation Details

### Compendium Pack
- All starsign conditions are stored in the `starsign-conditions` compendium
- Path: `packs/starsign-conditions/`
- The compendium is automatically loaded when the module is enabled

### Condition Structure
Each condition item includes:
- **Name**: The starsign name (e.g., "The Wolf Twins")
- **Slug**: Unique identifier (e.g., "starsign-wolf-twins")
- **Image**: Custom icon from the `images/` directory
- **Description**: Full myth and aspect description formatted as HTML
- **Type**: "condition" (PF2e item type)
- **Removable**: `true` (can be manually removed)
- **Active**: `true` (active by default when applied)

### Current Starsigns with Conditions

1. **The Wolf Twins** (Humanity) - `starsign-wolf-twins`
2. **The Stone Father** (Dwarves) - `starsign-stone-father`
3. **The Verdant Crown** (Halflings) - `starsign-verdant-crown`
4. **The Silent Moon** (Gnomes) - `starsign-silent-moon`
5. **The Shadow's Edge** (Goblins) - `starsign-shadows-edge`
6. **The Stormbreaker** (Orcs) - `starsign-stormbreaker`
7. **The Crystal Bloom** (Leshy) - `starsign-crystal-bloom`
8. **The Seraphic Flame** (Nephilim) - `starsign-seraphic-flame`
9. **The Wandering Star** (Changelings) - `starsign-wandering-star`

## Testing Checklist

### Basic Functionality
- [ ] Enable the module in Foundry VTT
- [ ] Verify the "Starsign Conditions" compendium appears in the compendium browser
- [ ] Create or open a character with a starsign
- [ ] Click on the starsign name to activate it
- [ ] Verify a chat message appears announcing the activation
- [ ] Verify the condition is applied to the character

### Token Display
- [ ] Check that the condition icon appears on the character's token
- [ ] Right-click the token and verify the condition shows in the token HUD
- [ ] Hover over the condition icon to see its description

### Character Sheet
- [ ] Open the character sheet
- [ ] Verify the condition appears in the conditions section
- [ ] Check that the condition icon and name are visible

### Manual Removal
- [ ] Right-click the condition on the token HUD
- [ ] Select "Remove" or click the X icon
- [ ] Verify the condition is removed from both token and character sheet
- [ ] Alternatively, remove the condition from the character sheet's conditions area

### Duplicate Prevention
- [ ] Click the starsign again after activating it once
- [ ] Verify you receive a notification saying the condition is already active
- [ ] Verify only one instance of the condition exists

## Troubleshooting

### Condition Not Appearing
- Make sure the module is enabled
- Check that the compendium pack is loaded (look in Compendium sidebar)
- Check the browser console for error messages
- Verify the starsign name exactly matches one of the 9 supported starsigns

### Token Icon Not Showing
- Make sure you're using the PF2e system (required for condition display)
- Verify the token is linked to the actor
- Try refreshing the canvas (F5)
- Check that the condition actually exists on the actor (open character sheet)

### Image Not Displaying
- Verify all images are in the `modules/mythborn-starsigns/images/` directory
- Check that image filenames match exactly (case-sensitive)
- Clear your browser cache and reload Foundry

## Future Enhancements

If you have more than 9 starsigns (you mentioned 20 in the README), you'll need to:
1. Create additional condition JSON files in `packs/starsign-conditions/`
2. Add the starsign names to the mapping in `getConditionSlugForStarsign()` function
3. Ensure corresponding images exist in the `images/` directory

## Technical Notes

- Conditions are PF2e `Item` documents with type `"condition"`
- The PF2e system handles all token display and removal automatically
- The module uses `actor.createEmbeddedDocuments("Item", [conditionData])` to apply conditions
- Checking for existing conditions uses `actor.itemTypes.condition` collection

