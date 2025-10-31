# Mythborn: Starsigns (PF2e, Foundry v13)

A Foundy VTT module to add custom star signs to Pathfinder 2E

**What it does**
- Adds a *Starsign* field to PF2e PC sheets
- Automatically rolls on **The Constellations of the Mythborn** table from the compendium when a character is created
- All starsign effects are fully automated with PF2e Rule Elements
- Shows the Starsign at the top of the sheet; GMs can reroll via a button (right-click value to copy/reset)
- **Clickable Starsign**: Players can click their starsign to announce its activation in chat
- **Condition System**: Activating a starsign applies a custom PF2e condition to the actor, automatically shown on their token


**Installation**
1. Create a folder named exactly `mythborn-starsigns` inside your Foundry `Data/modules/` directory.
2. Put the three files above in their paths:
- `Data/modules/mythborn-starsigns/module.json`
- `Data/modules/mythborn-starsigns/scripts/starsigns.js`
- `Data/modules/mythborn-starsigns/styles/style.css`
3. Launch Foundry (core v13), go to **Configure Settings → Modules**, enable **Mythborn: Starsigns (PF2e)**.
4. The module includes a pre-configured **Roll Table** and **Effect compendium** - no manual setup required!
5. Create a new PF2e Character — the Starsign should auto-populate and appear at the top of the sheet.


**Notes**
- The value is stored at `actor.flags["mythborn-starsigns"].starsign` so you can reference it in macros/journals.
- For existing PCs, toggle setting **Auto-assign Starsign if missing on open** (default on) or right-click the value → **Clear**, then have a GM click the reroll button.
- This module avoids modifying PF2e system templates; it injects a UI block at render time and uses actor flags for data storage.
- Click on any character's starsign to post a public chat message and apply the corresponding condition
- Conditions appear automatically on tokens and can be manually removed via the token HUD (right-click)
- See `STARSIGN-CONDITIONS.md` for detailed information about the condition system