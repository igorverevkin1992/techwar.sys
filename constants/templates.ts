// --- TOPIC TEMPLATES ---
// Pre-defined narrative frameworks. User selects one → topic field is pre-filled with a scaffold.
export interface TopicTemplate {
  id: string;
  name: string;
  category: 'geopolitics' | 'business' | 'history' | 'crime' | 'technology' | 'society';
  scaffold: string; // Fill-in-the-blank topic string shown in the topic input
  description: string;
}

export const TOPIC_TEMPLATES: TopicTemplate[] = [
  // Geopolitics
  { id: 'rise-fall',     category: 'geopolitics', name: 'Rise & Fall',          scaffold: 'The Rise and Fall of [FIGURE/REGIME]: How [COUNTRY] Lost Everything',      description: 'Power gained, maintained, then catastrophically lost' },
  { id: 'secret-deal',   category: 'geopolitics', name: 'Secret Deal',           scaffold: 'The Secret [COUNTRY–COUNTRY] Deal That Reshaped [REGION]',                description: 'Hidden diplomacy with world-altering consequences' },
  { id: 'proxy-war',     category: 'geopolitics', name: 'Proxy War',             scaffold: 'Inside [CONFLICT]: The Real War Behind the War in [REGION]',              description: 'Surface conflict masking deeper power struggle' },
  { id: 'sanctions',     category: 'geopolitics', name: 'Economic Siege',        scaffold: 'How [COUNTRY] Survived / Was Destroyed by [SANCTIONS/BLOCKADE]',          description: 'Economic warfare as geopolitical weapon' },
  // Business & Finance
  { id: 'billion-fraud', category: 'business',    name: 'Billion-Dollar Fraud',  scaffold: 'The [COMPANY/PERSON] Fraud: How $[AMOUNT]B Vanished and Nobody Noticed',  description: 'Corporate collapse built on deliberate deception' },
  { id: 'monopoly',      category: 'business',    name: 'Monopoly Machine',      scaffold: 'How [COMPANY] Quietly Took Over [INDUSTRY] Without Anyone Stopping It',   description: 'Market domination through strategy and exploitation' },
  { id: 'bubble',        category: 'business',    name: 'Asset Bubble',          scaffold: 'The [ASSET] Bubble: The Mania, The Crash, and Who Knew First',            description: 'Collective delusion and its inevitable collapse' },
  // History
  { id: 'cover-up',      category: 'history',     name: 'Government Cover-Up',   scaffold: 'The [COUNTRY] Cover-Up: What [GOVERNMENT] Hid About [EVENT] for [N] Years', description: 'State-sanctioned suppression of a damning truth' },
  { id: 'forgotten',     category: 'history',     name: 'Forgotten Operation',   scaffold: 'Operation [CODENAME]: The [COUNTRY] Secret That History Almost Forgot',   description: 'Declassified or rediscovered covert operation' },
  // Crime & Justice
  { id: 'cartel',        category: 'crime',       name: 'Criminal Empire',       scaffold: 'Inside [CARTEL/GANG]: The Criminal Empire That Owns [REGION/CITY]',       description: 'Organised crime that became a parallel state' },
  { id: 'whistleblower', category: 'crime',       name: 'Whistleblower',         scaffold: '[PERSON] Exposed [ORGANISATION]. Then [ORGANISATION] Came After Them.',   description: 'Truth-teller facing institutional retaliation' },
  // Technology
  { id: 'tech-race',     category: 'technology',  name: 'Tech Race',             scaffold: 'The [COUNTRY] vs [COUNTRY] Race to Control [TECHNOLOGY]',                 description: 'Strategic competition over transformative tech' },
  { id: 'surveillance',  category: 'technology',  name: 'Surveillance State',    scaffold: 'How [COUNTRY/COMPANY] Built the Most Powerful Surveillance System Ever',  description: 'Technology weaponised against citizens' },
  // Society
  { id: 'cult',          category: 'society',     name: 'Cult / Sect',           scaffold: 'Inside [ORGANISATION]: How [LEADER] Built a [CULT/SECT] and Why People Followed', description: 'Charismatic manipulation and mass psychology' },
  { id: 'propaganda',    category: 'society',     name: 'Propaganda Machine',    scaffold: 'The [COUNTRY] Propaganda Machine: How [REGIME] Controls What [NATION] Believes', description: 'Information warfare targeting one\'s own population' },
];
