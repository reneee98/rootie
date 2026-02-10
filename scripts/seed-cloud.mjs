// Quick script to seed plant_taxa to Supabase Cloud
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

const taxa = [
  { canonical_name: "Monstera deliciosa", synonyms: ["Monstera", "Split-leaf philodendron", "Swiss cheese plant"], popularity_score: 100 },
  { canonical_name: "Monstera adansonii", synonyms: ["Monstera monkey mask", "Swiss cheese vine", "Five holes plant"], popularity_score: 95 },
  { canonical_name: "Monstera albo borsigiana", synonyms: ["Monstera albo", "Variegated Monstera", "Monstera variegata"], popularity_score: 90 },
  { canonical_name: "Monstera Thai Constellation", synonyms: ["Thai Constellation", "Monstera Thai"], popularity_score: 88 },
  { canonical_name: "Monstera siltepecana", synonyms: ["Silver Monstera", "Monstera silver"], popularity_score: 70 },
  { canonical_name: "Monstera obliqua", synonyms: ["Monstera obliqua Peru"], popularity_score: 65 },
  { canonical_name: "Monstera dubia", synonyms: ["Shingle plant", "Monstera shingle"], popularity_score: 60 },
  { canonical_name: "Monstera pinnatipartita", synonyms: ["Monstera pinnati"], popularity_score: 55 },
  { canonical_name: "Philodendron hederaceum", synonyms: ["Heartleaf philodendron", "Philodendron scandens"], popularity_score: 92 },
  { canonical_name: "Philodendron bipinnatifidum", synonyms: ["Split-leaf philodendron", "Philodendron selloum", "Tree philodendron"], popularity_score: 85 },
  { canonical_name: "Philodendron gloriosum", synonyms: ["Velvet philodendron", "Philodendron velvet"], popularity_score: 88 },
  { canonical_name: "Philodendron melanochrysum", synonyms: ["Black gold philodendron", "Philodendron black gold"], popularity_score: 86 },
  { canonical_name: "Philodendron pink princess", synonyms: ["PPP", "Pink princess philodendron"], popularity_score: 94 },
  { canonical_name: "Philodendron micans", synonyms: ["Velvet leaf philodendron", "Philodendron velvet"], popularity_score: 82 },
  { canonical_name: "Philodendron brasil", synonyms: ["Philodendron Brazil", "Philodendron hederaceum Brasil"], popularity_score: 80 },
  { canonical_name: "Philodendron xanadu", synonyms: ["Philodendron Xanadu", "Winterbourn"], popularity_score: 75 },
  { canonical_name: "Epipremnum aureum", synonyms: ["Pothos", "Devil's ivy", "Golden pothos", "Scindapsus"], popularity_score: 98 },
  { canonical_name: "Epipremnum pinnatum", synonyms: ["Dragon tail", "Cebu blue pothos", "Epipremnum Cebu blue"], popularity_score: 84 },
  { canonical_name: "Scindapsus pictus", synonyms: ["Satin pothos", "Silver pothos", "Scindapsus silver"], popularity_score: 85 },
  { canonical_name: "Alocasia amazonica", synonyms: ["Alocasia Polly", "African mask", "Elephant ear"], popularity_score: 82 },
  { canonical_name: "Alocasia zebrina", synonyms: ["Zebra plant", "Alocasia zebra"], popularity_score: 78 },
  { canonical_name: "Alocasia black velvet", synonyms: ["Alocasia Black Velvet", "Black velvet"], popularity_score: 80 },
  { canonical_name: "Alocasia reginula", synonyms: ["Black velvet Alocasia", "Little queen"], popularity_score: 72 },
  { canonical_name: "Anthurium clarinervium", synonyms: ["Velvet cardboard anthurium", "Anthurium velvet"], popularity_score: 76 },
  { canonical_name: "Anthurium crystallinum", synonyms: ["Crystal anthurium", "Anthurium crystal"], popularity_score: 74 },
  { canonical_name: "Anthurium andraeanum", synonyms: ["Flamingo flower", "Anthurium red", "Laceleaf"], popularity_score: 68 },
  { canonical_name: "Calathea roseopicta", synonyms: ["Calathea medallion", "Rose painted calathea"], popularity_score: 80 },
  { canonical_name: "Calathea orbifolia", synonyms: ["Calathea round leaf", "Orbifolia"], popularity_score: 75 },
  { canonical_name: "Calathea lancifolia", synonyms: ["Rattlesnake plant", "Calathea rattlesnake"], popularity_score: 72 },
  { canonical_name: "Maranta leuconeura", synonyms: ["Prayer plant", "Maranta prayer plant", "Rabbit tracks"], popularity_score: 78 },
  { canonical_name: "Ficus lyrata", synonyms: ["Fiddle leaf fig", "FLF", "Ficus fiddle"], popularity_score: 90 },
  { canonical_name: "Ficus elastica", synonyms: ["Rubber plant", "Rubber tree", "Ficus rubber"], popularity_score: 85 },
  { canonical_name: "Ficus benjamina", synonyms: ["Weeping fig", "Ficus tree"], popularity_score: 70 },
  { canonical_name: "Sansevieria trifasciata", synonyms: ["Snake plant", "Mother-in-law's tongue", "Dracaena trifasciata"], popularity_score: 92 },
  { canonical_name: "Sansevieria cylindrica", synonyms: ["Cylindrical snake plant", "Spear sansevieria"], popularity_score: 65 },
  { canonical_name: "Dracaena marginata", synonyms: ["Dragon tree", "Madagascar dragon tree"], popularity_score: 75 },
  { canonical_name: "Dracaena fragrans", synonyms: ["Corn plant", "Dracaena corn", "Happy plant"], popularity_score: 70 },
  { canonical_name: "Zamioculcas zamiifolia", synonyms: ["ZZ plant", "Zamioculcas", "Zanzibar gem"], popularity_score: 88 },
  { canonical_name: "Spathiphyllum", synonyms: ["Peace lily", "Spathiphyllum peace lily"], popularity_score: 82 },
  { canonical_name: "Aglaonema", synonyms: ["Chinese evergreen", "Aglaonema red", "Aglaonema silver"], popularity_score: 78 },
  { canonical_name: "Syngonium podophyllum", synonyms: ["Arrowhead plant", "Syngonium", "Goosefoot"], popularity_score: 80 },
  { canonical_name: "Syngonium pink", synonyms: ["Pink Syngonium", "Syngonium neon"], popularity_score: 72 },
  { canonical_name: "Pilea peperomioides", synonyms: ["Chinese money plant", "Pilea", "Pancake plant", "UFO plant"], popularity_score: 86 },
  { canonical_name: "Pilea cadierei", synonyms: ["Aluminum plant", "Pilea aluminum"], popularity_score: 60 },
  { canonical_name: "Hoya carnosa", synonyms: ["Wax plant", "Hoya wax", "Porcelain flower"], popularity_score: 82 },
  { canonical_name: "Hoya obovata", synonyms: ["Hoya obovata splash", "Hoya splash"], popularity_score: 76 },
  { canonical_name: "Hoya kerrii", synonyms: ["Sweetheart hoya", "Valentine hoya", "Hoya heart"], popularity_score: 80 },
  { canonical_name: "Tradescantia zebrina", synonyms: ["Wandering Jew", "Inch plant", "Tradescantia purple"], popularity_score: 78 },
  { canonical_name: "Tradescantia nanouk", synonyms: ["Tradescantia pink", "Fantasy Venice"], popularity_score: 72 },
  { canonical_name: "Peperomia obtusifolia", synonyms: ["Baby rubber plant", "Peperomia green"], popularity_score: 70 },
  { canonical_name: "Peperomia caperata", synonyms: ["Radiator plant", "Peperomia ripple"], popularity_score: 68 },
  { canonical_name: "Crassula ovata", synonyms: ["Jade plant", "Money tree", "Jade tree"], popularity_score: 85 },
  { canonical_name: "Echeveria", synonyms: ["Echeveria succulent", "Hen and chicks"], popularity_score: 75 },
  { canonical_name: "Kalanchoe blossfeldiana", synonyms: ["Flaming Katy", "Kalanchoe"], popularity_score: 62 },
  { canonical_name: "Haworthia", synonyms: ["Haworthia succulent", "Zebra cactus"], popularity_score: 68 },
  { canonical_name: "Sedum morganianum", synonyms: ["Burro's tail", "Donkey tail", "Sedum burro"], popularity_score: 74 },
  { canonical_name: "Senecio rowleyanus", synonyms: ["String of pearls", "Senecio pearls"], popularity_score: 84 },
  { canonical_name: "Ceropegia woodii", synonyms: ["String of hearts", "Chain of hearts", "Rosary vine"], popularity_score: 86 },
  { canonical_name: "Begonia rex", synonyms: ["Rex begonia", "Painted leaf begonia"], popularity_score: 70 },
  { canonical_name: "Oxalis triangularis", synonyms: ["Purple shamrock", "False shamrock", "Oxalis purple"], popularity_score: 68 },
];

// First check if data already exists
const { count } = await supabase
  .from("plant_taxa")
  .select("*", { count: "exact", head: true });

if (count && count > 0) {
  console.log(`plant_taxa already has ${count} rows — skipping seed.`);
  process.exit(0);
}

const { error } = await supabase.from("plant_taxa").insert(taxa);

if (error) {
  console.error("Seed error:", error);
  process.exit(1);
}

console.log(`Seeded ${taxa.length} plant taxa successfully.`);
