// --- DEMONETIZATION BLACKLIST ---
// Full vocabulary from YOUTUBE ADVERTISER BLACKLIST in Writer prompts (7 categories).
// Single source of truth — used by Audit Panel and AUDIT_FIX agent.
export const DEMONETIZATION_BLACKLIST: string[] = [
  // CAT-1: Violence & Conflict
  'assassination', 'assassinate', 'liquidation', 'killing', 'murder', 'murdered',
  'slaughter', 'massacre', 'genocide', 'torture', 'execution', 'beheading', 'eliminate',
  'violence', 'brutality', 'atrocity', 'carnage', 'slaying', 'stabbing', 'warlord',
  'hostage', 'war crime', 'ethnic cleansing',
  // CAT-2: Weapons & Firearms
  'explosive', 'explosives', 'grenade', 'sniper', 'landmine', 'nuke',
  'shooter', 'decapitation', 'fatality', 'fatalities',
  // CAT-3: Drugs
  'cocaine', 'heroin', 'fentanyl', 'opioid', 'overdose', 'narcotics', 'junkie',
  'drug cartel', 'drug trafficking', 'drug dealer',
  // CAT-4: Mental Health (highest risk)
  'suicide', 'suicidal', 'self-harm', 'anorexia', 'bulimia', 'mental breakdown',
  // CAT-5: Extremism
  'terrorist', 'terrorism', 'jihad', 'extremist', 'radicalization', 'hate crime',
  'white supremacist',
  // CAT-6: Sexual content
  'rape', 'sexual assault', 'molestation', 'pedophile', 'grooming',
  // CAT-7: General controversy
  'dead bodies', 'death toll',
];
