/**
 * Roamly Database Seed Script
 * Populates 8 destinations, 2 users (including primary demo user),
 * 3 sample trips with detailed itinerary stops, bookmarks, likes, and comments.
 */

const { getDb, withTransaction } = require('./db');

const USERS = [
  {
    id: 1,
    name: 'Elena Rostova',
    username: 'elenatravels',
    email: 'elena@roamly.local',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    bio: 'Architectural photographer & slow-travel enthusiast. Seeking quiet courtyards, ceramic studios, and coastal railways.',
    home_city: 'Florence, Italy'
  },
  {
    id: 2,
    name: 'Marcus Vance',
    username: 'marcusvance',
    email: 'marcus@roamly.local',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    bio: 'Culinary writer and Alpine hiker. Documenting hyper-regional food traditions and mountain passes across continents.',
    home_city: 'Vienna, Austria'
  }
];

const DESTINATIONS = [
  {
    id: 1,
    title: 'Kyoto',
    country: 'Japan',
    continent: 'Asia',
    tagline: 'Centuries of moss gardens, timber teahouses, and morning mist.',
    description: 'Kyoto preserves Japan’s classic contemplative spirit. From the bamboo groves of Arashiyama and crimson torii gates of Fushimi Inari to tucked-away matcha ateliers in Gion, every cobblestone street unfolds at an unhurried, poetic pace.',
    cover_image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
    season: 'Autumn (October – November)',
    budget_tier: '$$$',
    tags: 'Culture, Culinary, Temples, Heritage'
  },
  {
    id: 2,
    title: 'Amalfi Coast',
    country: 'Italy',
    continent: 'Europe',
    tagline: 'Terraced lemon groves hanging high above the Tyrrhenian Sea.',
    description: 'A dramatic ribbon of coastal cliffs stitched with pastel hamlets. Positano, Ravello, and Amalfi offer cliffside trattorias, scent of wild rosemary, and sweeping Mediterranean panoramas traversed by the legendary Sentiero degli Dei.',
    cover_image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
    season: 'Late Spring (May – June)',
    budget_tier: '$$$',
    tags: 'Coastal, Scenic, Culinary, Architecture'
  },
  {
    id: 3,
    title: 'Oaxaca',
    country: 'Mexico',
    continent: 'Americas',
    tagline: 'Zapotec weaving, artisanal mezcal, and smoky market corridors.',
    description: 'The culinary and artistic soul of southern Mexico. Oaxaca City captivates with barro negro pottery, vibrant Central de Abastos markets, indigenous textile villages of the central valleys, and ancient archaeological heights of Monte Albán.',
    cover_image: 'https://images.unsplash.com/photo-1512813195386-6cf811ad3542?auto=format&fit=crop&w=1200&q=80',
    season: 'Winter & Autumn (October – March)',
    budget_tier: '$',
    tags: 'Culinary, Artisan, History, Markets'
  },
  {
    id: 4,
    title: 'Reykjavík & The South Coast',
    country: 'Iceland',
    continent: 'Europe',
    tagline: 'Basalt sea stacks, glacial lagoons, and dancing aurora skies.',
    description: 'Where volcanic fire collides with Arctic ice. Journey past thundering waterfalls at Skógafoss, the midnight-black sands of Reynisfjara, and floating sapphire icebergs at Jökulsárlón, returning to Reykjavik’s cozy geothermal bakeries.',
    cover_image: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=1200&q=80',
    season: 'Autumn – Winter (September – February)',
    budget_tier: '$$$',
    tags: 'Nature, Northern Lights, Landscapes, Adventure'
  },
  {
    id: 5,
    title: 'Chefchaouen',
    country: 'Morocco',
    continent: 'Africa',
    tagline: 'The ethereal indigo labyrinth of the Rif Mountains.',
    description: 'Tucked beneath the twin peaks of the Rif mountains, Chefchaouen glows with shades of cobalt, cerulean, and powder blue. Quiet courtyards, handwoven wool blankets, and the aroma of spiced mint tea evoke a timeless sanctuary.',
    cover_image: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80',
    season: 'Spring (April – May)',
    budget_tier: '$',
    tags: 'Architecture, Mountain, Photography, Culture'
  },
  {
    id: 6,
    title: 'Queenstown & Fiordland',
    country: 'New Zealand',
    continent: 'Oceania',
    tagline: 'Glacial fjords, mirror lakes, and boundless southern wilderness.',
    description: 'Flanked by the Remarkables mountain range on the shores of Lake Wakatipu. Queenstown is the premier gateway to majestic Milford Sound, native beech forests, and serene Otago wine valleys celebrated for delicate Pinot Noirs.',
    cover_image: 'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?auto=format&fit=crop&w=1200&q=80',
    season: 'Summer (December – February)',
    budget_tier: '$$',
    tags: 'Nature, Lakes, Hiking, Wine'
  },
  {
    id: 7,
    title: 'Porto & Douro Valley',
    country: 'Portugal',
    continent: 'Europe',
    tagline: 'Azulejo-tiled façades, iron bridges, and river mist over wine rabelos.',
    description: 'Perched along the steep banks of the Douro River, Porto enchants with rustic tavernas, gilded baroque churches, historic port cellars in Vila Nova de Gaia, and terraced vineyards that carved the world’s oldest demarcated wine region.',
    cover_image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&q=80',
    season: 'Autumn (September – October)',
    budget_tier: '$$',
    tags: 'Heritage, Wine, Coastal, Architecture'
  },
  {
    id: 8,
    title: 'Banff & Lake Louise',
    country: 'Canada',
    continent: 'Americas',
    tagline: 'Turquoise glacial waters framed by rugged cathedral peaks.',
    description: 'The crown jewel of the Canadian Rockies. Cradled in Alberta’s alpine wilderness, Banff offers crystalline waters at Moraine Lake, larch valley trails that turn burnished gold in autumn, and steaming mountain mineral pools.',
    cover_image: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1200&q=80',
    season: 'Summer & Autumn (July – September)',
    budget_tier: '$$',
    tags: 'Alpine, Lakes, Wildlife, Hiking'
  }
];

const TRIPS = [
  {
    id: 1,
    user_id: 1,
    destination_id: 1,
    title: 'Autumn Light & Kaiseki in Kyoto',
    start_date: '2026-11-04',
    end_date: '2026-11-10',
    currency: 'USD',
    estimated_budget: 2800,
    cover_image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
    notes: 'Focus on early morning temple walks before crowds arrive, traditional ceramic studio visits in Gojozaka, and seasonal autumn kaiseki dinners.'
  },
  {
    id: 2,
    user_id: 2,
    destination_id: 2,
    title: 'Coastal Drift: Amalfi to Positano',
    start_date: '2026-06-12',
    end_date: '2026-06-17',
    currency: 'USD',
    estimated_budget: 3400,
    cover_image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
    notes: 'Traversing the cliff trails, chartered wooden boat along the coast of Capri, and tracing old lemon paths through Minori and Ravello.'
  },
  {
    id: 3,
    user_id: 1,
    destination_id: 3,
    title: 'Clay, Color & Copal: Oaxaca Valley',
    start_date: '2026-10-28',
    end_date: '2026-11-03',
    currency: 'USD',
    estimated_budget: 1350,
    cover_image: 'https://images.unsplash.com/photo-1512813195386-6cf811ad3542?auto=format&fit=crop&w=1200&q=80',
    notes: 'Exploring the artisan communities of San Bartolo Coyotepec and Teotitlán del Valle, sampling mole negro, and witnessing Day of the Dead vigils.'
  }
];

const TRIP_STOPS = [
  // Stops for Trip 1 (Kyoto)
  {
    trip_id: 1,
    day_number: 1,
    place_name: 'Daitoku-ji Zen Garden & Tea Ceremony',
    category: 'Culture',
    cost: 45,
    notes: 'Private morning tea ceremony inside a 16th-century sub-temple with master Hojun.',
    sort_order: 1
  },
  {
    trip_id: 1,
    day_number: 1,
    place_name: 'Gion Karyo (Autumn Kaiseki)',
    category: 'Food',
    cost: 160,
    notes: 'Seasonal multi-course dining featuring matsutake broth and Kyoto autumn vegetables.',
    sort_order: 2
  },
  {
    trip_id: 1,
    day_number: 2,
    place_name: 'Otagi Nenbutsu-ji & Sagano Bamboo Grove',
    category: 'Nature',
    cost: 20,
    notes: 'Explore 1,200 whimsical stone rakan sculptures tucked deep in the northern hills.',
    sort_order: 1
  },
  {
    trip_id: 1,
    day_number: 2,
    place_name: 'Ryokan Sawaya Honten',
    category: 'Stay',
    cost: 280,
    notes: 'Traditional tatami accommodation with cedar cypress baths and cypress aroma.',
    sort_order: 2
  },
  {
    trip_id: 1,
    day_number: 3,
    place_name: 'Kiyomizu-yaki Ceramic Studio Workshop',
    category: 'Activity',
    cost: 95,
    notes: 'Wheel-throwing session crafting handmade matcha bowls in Gojozaka pottery district.',
    sort_order: 1
  },

  // Stops for Trip 2 (Amalfi)
  {
    trip_id: 2,
    day_number: 1,
    place_name: 'Villa Maria Terrazza, Ravello',
    category: 'Stay',
    cost: 420,
    notes: 'Cliffside heritage stay with private balcony overlooking the Mediterranean.',
    sort_order: 1
  },
  {
    trip_id: 2,
    day_number: 2,
    place_name: 'Sentiero degli Dei (Path of the Gods)',
    category: 'Nature',
    cost: 0,
    notes: 'Morning cliff hike from Bomerano to Nocelle with coastal panoramas.',
    sort_order: 1
  },
  {
    trip_id: 2,
    day_number: 2,
    place_name: 'Trattoria Da Adolfo (Laurito Beach)',
    category: 'Food',
    cost: 110,
    notes: 'Lakeside red-fish boat transfer to quiet cove for grilled mozzarella in lemon leaves.',
    sort_order: 2
  },
  {
    trip_id: 2,
    day_number: 3,
    place_name: 'Private Gozzo Boat to Faraglioni, Capri',
    category: 'Activity',
    cost: 380,
    notes: 'Four-hour wooden boat excursion swimming in secret sea grottos.',
    sort_order: 1
  },

  // Stops for Trip 3 (Oaxaca)
  {
    trip_id: 3,
    day_number: 1,
    place_name: 'Hotel Los Amantes Oaxaca',
    category: 'Stay',
    cost: 180,
    notes: 'Colonial boutique hotel with views of Santo Domingo church spires.',
    sort_order: 1
  },
  {
    trip_id: 3,
    day_number: 1,
    place_name: 'Pasillo de Humo (Smoke Hall Market)',
    category: 'Food',
    cost: 25,
    notes: 'Tasajo, cecina, grilled scallions, and handmade heirloom tortillas hot off the comal.',
    sort_order: 2
  },
  {
    trip_id: 3,
    day_number: 2,
    place_name: 'Monte Albán Sunrise Tour',
    category: 'Culture',
    cost: 40,
    notes: 'Ancient Zapotec ceremonial acropolis rising above the Oaxaca valley basin.',
    sort_order: 1
  },
  {
    trip_id: 3,
    day_number: 2,
    place_name: 'Traditional Palenque Mezcal Tasting, Matatlán',
    category: 'Activity',
    cost: 65,
    notes: 'Wild agave varietals (Tobalá, Tepeztate) distilled in clay pot stills.',
    sort_order: 2
  }
];

const BOOKMARKS = [
  { user_id: 1, destination_id: 2 }, // Elena bookmarked Amalfi Coast
  { user_id: 1, destination_id: 7 }, // Elena bookmarked Porto
  { user_id: 2, destination_id: 1 }  // Marcus bookmarked Kyoto
];

const TRIP_LIKES = [
  { user_id: 2, trip_id: 1 }, // Marcus liked Elena's Kyoto trip
  { user_id: 1, trip_id: 2 }, // Elena liked Marcus's Amalfi trip
  { user_id: 2, trip_id: 3 }  // Marcus liked Elena's Oaxaca trip
];

const COMMENTS = [
  {
    trip_id: 1,
    user_id: 2,
    content: 'The Daitoku-ji morning walk is exceptional in early November. Don’t miss the maple canopy behind the Zuiho-in subtemple!'
  },
  {
    trip_id: 1,
    user_id: 1,
    content: 'Thank you Marcus! I added it to Day 1 notes. Will pack warm layers for the early morning temple corridors.'
  },
  {
    trip_id: 2,
    user_id: 1,
    content: 'Da Adolfo is heaven on earth! Did you reserve the boat pick-up in advance, or do they answer at the Positano dock?'
  }
];

function seedDatabase(force = false) {
  const db = getDb();

  // Check if destinations table already has records
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM destinations').get().count;

  if (existingCount > 0 && !force) {
    console.log(`Database already has ${existingCount} destinations. Skipping seed.`);
    return { seeded: false, count: existingCount };
  }

  console.log('Seeding Roamly database with curated editorial records...');

  withTransaction((transactionDb) => {
    // If forced, clear existing data cleanly
    if (force) {
      transactionDb.exec('DELETE FROM comments;');
      transactionDb.exec('DELETE FROM trip_likes;');
      transactionDb.exec('DELETE FROM bookmarks;');
      transactionDb.exec('DELETE FROM trip_stops;');
      transactionDb.exec('DELETE FROM trips;');
      transactionDb.exec('DELETE FROM destinations;');
      transactionDb.exec('DELETE FROM users;');
      console.log('Cleared existing records for clean re-seed.');
    }

    // 1. Users
    const insertUser = transactionDb.prepare(`
      INSERT OR REPLACE INTO users (id, name, username, email, avatar_url, bio, home_city)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const u of USERS) {
      insertUser.run(u.id, u.name, u.username, u.email, u.avatar_url, u.bio, u.home_city);
    }

    // 2. Destinations
    const insertDest = transactionDb.prepare(`
      INSERT OR REPLACE INTO destinations (id, title, country, continent, tagline, description, cover_image, season, budget_tier, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const d of DESTINATIONS) {
      insertDest.run(d.id, d.title, d.country, d.continent, d.tagline, d.description, d.cover_image, d.season, d.budget_tier, d.tags);
    }

    // 3. Trips
    const insertTrip = transactionDb.prepare(`
      INSERT OR REPLACE INTO trips (id, user_id, destination_id, title, start_date, end_date, currency, estimated_budget, cover_image, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const t of TRIPS) {
      insertTrip.run(t.id, t.user_id, t.destination_id, t.title, t.start_date, t.end_date, t.currency, t.estimated_budget, t.cover_image, t.notes);
    }

    // 4. Trip Stops
    const insertStop = transactionDb.prepare(`
      INSERT INTO trip_stops (trip_id, day_number, place_name, category, cost, notes, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const s of TRIP_STOPS) {
      insertStop.run(s.trip_id, s.day_number, s.place_name, s.category, s.cost, s.notes, s.sort_order);
    }

    // 5. Bookmarks
    const insertBookmark = transactionDb.prepare(`
      INSERT OR IGNORE INTO bookmarks (user_id, destination_id)
      VALUES (?, ?)
    `);
    for (const b of BOOKMARKS) {
      insertBookmark.run(b.user_id, b.destination_id);
    }

    // 6. Trip Likes
    const insertLike = transactionDb.prepare(`
      INSERT OR IGNORE INTO trip_likes (user_id, trip_id)
      VALUES (?, ?)
    `);
    for (const l of TRIP_LIKES) {
      insertLike.run(l.user_id, l.trip_id);
    }

    // 7. Comments
    const insertComment = transactionDb.prepare(`
      INSERT INTO comments (trip_id, user_id, content)
      VALUES (?, ?, ?)
    `);
    for (const c of COMMENTS) {
      insertComment.run(c.trip_id, c.user_id, c.content);
    }
  });

  console.log('Seeding completed successfully!');
  return { seeded: true, destinations: DESTINATIONS.length, trips: TRIPS.length };
}

// Allow standalone execution via `node src/config/seed.js`
if (require.main === module) {
  const force = process.argv.includes('--force');
  seedDatabase(force);
}

module.exports = {
  seedDatabase,
  USERS,
  DESTINATIONS,
  TRIPS,
  TRIP_STOPS,
  BOOKMARKS,
  TRIP_LIKES,
  COMMENTS
};
