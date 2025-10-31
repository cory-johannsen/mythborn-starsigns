# Compendium Build Instructions

## Quick Start

The compendium has already been built! The `starsign-conditions.db` file contains all 9 conditions and is ready to use in Foundry VTT.

## How the System Works

### File Structure
```
packs/
├── json/                           # Source files (edit these)
│   ├── wolf-twins.json
│   ├── stone-father.json
│   └── ... (7 more)
└── starsign-conditions.db          # Built compendium (loaded by Foundry)
```

### When to Rebuild

Rebuild the compendium whenever you:
- Add a new starsign condition
- Edit existing condition descriptions
- Change condition images
- Modify any JSON properties

### How to Rebuild

**Method 1: Using npm (Recommended)**
```bash
npm run build
```

**Method 2: Using the build script directly**
```bash
node build-compendium.js
```

**Method 3: Using jq command (if you have jq installed)**
```bash
cat packs/json/*.json | jq -c . > packs/starsign-conditions.db
```

## Adding New Starsigns

### Step 1: Create Source JSON File

Create a new file in `packs/json/` (e.g., `new-starsign.json`):

```json
{
  "_id": "StarsignUnique16Char",
  "name": "The New Starsign",
  "type": "condition",
  "img": "modules/mythborn-starsigns/images/The New Starsign.png",
  "system": {
    "slug": "starsign-new-starsign",
    "description": {
      "value": "<p><strong>Myth:</strong> Description here...</p><p><strong>Aspect:</strong> Ability here...</p>"
    },
    "group": null,
    "value": {
      "isValued": false,
      "value": null
    },
    "duration": null,
    "persistent": false,
    "active": true,
    "removable": true,
    "references": {
      "parent": { "id": "", "type": "" },
      "children": [],
      "overrides": [],
      "overriddenBy": []
    },
    "overrides": []
  },
  "effects": [],
  "folder": null,
  "sort": 0,
  "ownership": { "default": 0 },
  "flags": {},
  "_stats": {
    "compendiumSource": null,
    "duplicateSource": null,
    "coreVersion": "13.0.0",
    "systemId": "pf2e",
    "systemVersion": "6.0.0"
  }
}
```

**Important Fields:**
- `_id`: Must be unique, 16 characters (letters/numbers)
- `name`: Display name (must match RollTable entry exactly)
- `slug`: Unique identifier, use format `starsign-name-here`
- `img`: Path to image file

### Step 2: Add Image

Place the image in `images/` directory with consistent naming.

### Step 3: Update Code Mapping

Edit `scripts/starsigns.js`, add to the mapping around line 110:

```javascript
function getConditionSlugForStarsign(starsignName) {
  const mapping = {
    "The Wolf Twins": "starsign-wolf-twins",
    "The Stone Father": "starsign-stone-father",
    // ... existing entries ...
    "The New Starsign": "starsign-new-starsign"  // ADD THIS
  };
  return mapping[starsignName] || null;
}
```

### Step 4: Rebuild Compendium

```bash
npm run build
```

### Step 5: Update RollTable

Add the new starsign to your "The Constellations of the Mythborn" RollTable in Foundry.

## Troubleshooting

### "Compendium not found" error
- Verify `packs/starsign-conditions.db` exists
- Check `module.json` has correct path: `"path": "packs/starsign-conditions.db"`
- Reload Foundry VTT completely

### Condition not appearing in compendium
- Run the build command
- Check that `.db` file has the right number of lines: `wc -l packs/starsign-conditions.db`
- Verify JSON is valid: `jq . packs/json/yourfile.json`

### Build fails
- Check that all JSON files are valid
- Ensure each file has unique `_id`
- Verify `type: "condition"` in each file

## Version Control

**What to commit:**
- ✅ `packs/json/*.json` (source files)
- ✅ `packs/starsign-conditions.db` (built file)
- ✅ `build-compendium.js` (build script)
- ✅ `package.json`

**What to ignore:**
- ❌ `node_modules/` (if you install any dependencies)

## Migrating RollTable to Use Compendium

If you want your RollTable to pull directly from the compendium:

### Option 1: Manual (in Foundry UI)
1. Open the RollTable
2. For each result, change the "Type" to "Compendium"
3. Select "Starsign Conditions" compendium
4. Pick the matching condition
5. Save the table

### Option 2: Using UUIDs (advanced)
Edit the RollTable JSON to use compendium UUIDs:

```json
{
  "type": 2,
  "collection": "mythborn-starsigns.starsign-conditions",
  "resultId": "StarsignWolfTwins00",
  "text": "The Wolf Twins",
  "img": "modules/mythborn-starsigns/images/The Wolf Twins (Humans).png",
  "weight": 1,
  "range": [1, 1]
}
```

**UUID format:** `Compendium.mythborn-starsigns.starsign-conditions.<_id>`

## Benefits of This System

✅ **Easy to maintain** - Edit readable JSON files  
✅ **Version controlled** - Track changes in git  
✅ **Reusable** - Compendium can be used by RollTables, macros, etc.  
✅ **Shareable** - Export and share with other GMs  
✅ **Dynamic** - Updates propagate automatically  
✅ **Standard** - Uses Foundry's native compendium system  

## Quick Commands Reference

```bash
# Build the compendium
npm run build

# Verify compendium structure
head -n 1 packs/starsign-conditions.db | jq .

# Count conditions
wc -l packs/starsign-conditions.db

# Validate a JSON file
jq . packs/json/wolf-twins.json

# Rebuild (alternative)
node build-compendium.js
```

---

**Last Built:** Check file timestamp: `ls -lh packs/starsign-conditions.db`

