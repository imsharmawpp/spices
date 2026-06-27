<?php
declare(strict_types=1);

/**
 * Migrate + seed the database (SQLite by default).
 * Usage:  php database/migrate.php
 * Also invoked automatically on first request if the SQLite DB is missing.
 */

use App\Core\Database;
use App\Support\Env;

require_once __DIR__ . '/../app/Support/Env.php';
require_once __DIR__ . '/../app/Support/autoload.php';

Env::load(__DIR__ . '/../.env');
Env::load(__DIR__ . '/../.env.example'); // fallback defaults

function run_migration(): void
{
    $pdo = Database::connection();
    $driver = Database::driver(); // effective driver (after any fallback)

    if ($driver === 'mysql') {
        $sql = file_get_contents(__DIR__ . '/schema.mysql.sql');
        foreach (array_filter(array_map('trim', explode(';', $sql))) as $stmt) {
            if ($stmt !== '') {
                $pdo->exec($stmt);
            }
        }
        seed($pdo);
        echo (PHP_SAPI === 'cli') ? "MySQL database migrated and seeded successfully.\n" : '';
        return;
    }

    $schema = file_get_contents(__DIR__ . '/schema.sqlite.sql');
    $pdo->exec($schema);

    seed($pdo);
    if (PHP_SAPI === 'cli') {
        echo "Database migrated and seeded successfully.\n";
    }
}

/** Convert a "\u{1F7E1}" style codepoint string into a real UTF-8 emoji. */
function emoji(string $s): string
{
    if (preg_match('/\\\\u\{([0-9A-Fa-f]+)\}/', $s, $m)) {
        return mb_chr((int) hexdec($m[1]), 'UTF-8');
    }
    return $s;
}

function seed(PDO $pdo): void
{
    // ---- Settings ----
    $settings = [
        'store_name' => 'Saffra Spices',
        'free_shipping_threshold' => '49.00',
        'flat_shipping' => '5.95',
        'tax_rate' => '0.08',
        'announcement' => 'Free shipping on orders over $49 · Freshly ground to order',
    ];
    $stmt = $pdo->prepare('INSERT INTO settings (`key`, value) VALUES (?, ?)');
    foreach ($settings as $k => $v) {
        $stmt->execute([$k, $v]);
    }

    // ---- Admin + demo customer ----
    $pdo->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)')
        ->execute(['Store Admin', 'admin@saffra.test', password_hash('admin123', PASSWORD_DEFAULT), 'admin']);
    $pdo->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)')
        ->execute(['Maya Patel', 'maya@example.com', password_hash('password', PASSWORD_DEFAULT), 'customer']);

    // ---- Categories ----
    $categories = [
        ['Whole Spices', 'whole-spices', 'Sun-dried whole spices, sealed for maximum aroma.', '\u{1FAD8}', '#C8531B'],
        ['Ground Spices', 'ground-spices', 'Stone-ground to order for vivid colour and flavour.', '\u{1F9C2}', '#E0A422'],
        ['Blends & Masalas', 'blends-masalas', 'House blends balanced by our spice masters.', '\u{1F375}', '#9E3F12'],
        ['Gift Sets', 'gift-sets', 'Beautifully boxed sets for the cooks you love.', '\u{1F381}', '#7A5C3E'],
        ['Organic', 'organic', 'Certified-organic, single-origin spices.', '\u{1F33F}', '#3F7D3A'],
    ];
    $catStmt = $pdo->prepare('INSERT INTO categories (name, slug, description, emoji, accent_color, sort_order) VALUES (?,?,?,?,?,?)');
    $catId = [];
    foreach ($categories as $i => $c) {
        $catStmt->execute([$c[0], $c[1], $c[2], emoji($c[3]), $c[4], $i]);
        $catId[$c[1]] = (int) $pdo->lastInsertId();
    }

    // ---- Products ----
    // [name, slug, category, short, description, origin, usage, organic, form, emoji, color, badge, featured, bestseller, rating, rating_count, variants[[name,grams,price,compare,stock]] ]
    $products = [
        ['Turmeric Powder', 'turmeric-powder', 'ground-spices', 'Single-origin, high-curcumin golden turmeric.', 'Vibrant, earthy turmeric stone-ground from Erode roots. High curcumin content gives a deep golden colour and warm, peppery aroma.', 'Erode, India', 'Bloom in warm oil for curries, golden milk, and roasted vegetables.', 1, 'ground', '\u{1F7E1}', '#E0A422', 'Bestseller', 1, 1, 4.8, 126, [['100g',100,7.95,9.95,240],['250g',250,15.95,null,120],['500g',500,27.95,null,60]]],
        ['Smoked Paprika', 'smoked-paprika', 'ground-spices', 'Slow oak-smoked sweet paprika.', 'Sweet peppers smoked over oak then milled to a silky powder. Adds colour and a gentle campfire warmth to anything it touches.', 'La Vera, Spain', 'Dust over eggs, potatoes, and grilled meats; stir into stews.', 0, 'ground', '\u{1F336}', '#C8531B', 'Trending', 1, 1, 4.7, 88, [['100g',100,8.50,null,180],['250g',250,17.00,null,90]]],
        ['Ceylon Cinnamon Sticks', 'ceylon-cinnamon-sticks', 'whole-spices', 'True cinnamon quills, delicate and sweet.', 'Hand-rolled true Ceylon cinnamon quills with a fragrant, gently sweet profile far softer than cassia.', 'Sri Lanka', 'Simmer in milk, mulled drinks, rice, and tagines.', 0, 'whole', '\u{1F9F4}', '#9E3F12', null, 0, 1, 4.9, 64, [['8 sticks',40,9.95,12.95,150],['16 sticks',80,17.95,null,70]]],
        ['Black Peppercorns', 'black-peppercorns', 'whole-spices', 'Bold Tellicherry peppercorns.', 'Large, late-harvested Tellicherry peppercorns bursting with citrus and pine notes. Grind fresh for the best bite.', 'Malabar Coast, India', 'Grind over everything; toast whole for stocks and brines.', 0, 'whole', '\u{26AB}', '#2A2118', 'Bestseller', 1, 1, 4.8, 142, [['100g',100,6.95,null,300],['250g',250,14.50,null,140]]],
        ['Saffron Threads', 'saffron-threads', 'whole-spices', 'Grade A1 Sargol saffron threads.', 'Deep crimson, all-red Sargol threads with intense honeyed aroma. A little blooms into a glorious golden hue.', 'Khorasan, Iran', 'Steep in warm water; use in paella, biryani, and desserts.', 0, 'whole', '\u{1F3F5}', '#B3261E', 'Premium', 1, 0, 5.0, 39, [['1g',1,18.95,null,80],['2g',2,34.95,39.95,40]]],
        ['Garam Masala', 'garam-masala', 'blends-masalas', 'Warm North-Indian house blend.', 'Our signature garam masala: cardamom, clove, cinnamon, cumin and black pepper toasted and ground in small batches.', 'House blend', 'Add near the end of cooking to finish curries and dals.', 0, 'blend', '\u{1F35B}', '#9E3F12', 'Bestseller', 1, 1, 4.9, 110, [['80g',80,9.50,null,200],['200g',200,19.50,null,95]]],
        ['Cumin Seeds', 'cumin-seeds', 'whole-spices', 'Aromatic whole cumin.', 'Sun-dried whole cumin with a warm, nutty aroma that blooms when toasted.', 'Gujarat, India', 'Temper in hot oil to start curries; toast and grind for rubs.', 1, 'whole', '\u{1F33E}', '#B07B3E', null, 0, 0, 4.6, 57, [['100g',100,5.95,null,260],['250g',250,12.50,null,130]]],
        ['Cardamom Pods', 'cardamom-pods', 'whole-spices', 'Plump green cardamom pods.', 'Bright green cardamom pods with an intense floral-citrus perfume. The queen of spices.', 'Idukki, India', 'Crush into chai, rice, and desserts; whole in biryani.', 1, 'whole', '\u{1F7E2}', '#3F7D3A', 'Trending', 1, 0, 4.8, 73, [['50g',50,11.95,null,160],['100g',100,21.95,24.95,80]]],
        ['Chilli Flakes', 'chilli-flakes', 'ground-spices', 'Crushed sun-ripened red chillies.', 'Coarsely crushed red chillies with seeds for a bright, building heat.', 'Andhra Pradesh, India', 'Scatter over pizza, pasta, and roasted veg.', 0, 'ground', '\u{1F525}', '#C8531B', null, 0, 1, 4.5, 49, [['80g',80,6.50,null,220],['200g',200,13.50,null,110]]],
        ['Tandoori Masala', 'tandoori-masala', 'blends-masalas', 'Smoky, vivid grilling blend.', 'A vivid blend of paprika, ginger, garlic and warm spices built for the grill and the oven.', 'House blend', 'Mix with yoghurt to marinate chicken, paneer, or cauliflower.', 0, 'blend', '\u{1F357}', '#B3261E', null, 1, 0, 4.7, 61, [['90g',90,9.95,null,140],['220g',220,19.95,null,70]]],
        ['Coriander Seeds', 'coriander-seeds', 'whole-spices', 'Citrusy whole coriander.', 'Pale, round coriander seeds with a fresh, lemony sweetness. A backbone of countless blends.', 'Rajasthan, India', 'Toast and grind for curries, pickles, and rubs.', 1, 'whole', '\u{1F7E4}', '#B07B3E', null, 0, 0, 4.4, 33, [['100g',100,4.95,null,280],['250g',250,9.95,null,150]]],
        ['Spice Lovers Gift Box', 'spice-lovers-gift-box', 'gift-sets', 'Six signature spices, beautifully boxed.', 'A curated wooden box of six of our most-loved spices and blends, ready to gift with a handwritten card.', 'Assorted', 'The perfect present for any home cook.', 0, 'other', '\u{1F381}', '#7A5C3E', 'Gift', 1, 1, 4.9, 47, [['6-jar box',360,49.95,59.95,55]]],
        ['Everyday Curry Kit', 'everyday-curry-kit', 'gift-sets', 'Everything for a weeknight curry.', 'Turmeric, cumin, garam masala and chilli flakes with a recipe card to build curries from scratch.', 'Assorted', 'Start here if you are new to cooking with spices.', 0, 'other', '\u{1F9FA}', '#C8531B', null, 0, 0, 4.8, 28, [['4-jar kit',300,34.95,null,75]]],
        ['Organic Ginger Powder', 'organic-ginger-powder', 'organic', 'Warming certified-organic ginger.', 'Certified-organic dried ginger, finely milled for a clean, warming heat with citrus undertones.', 'Kerala, India', 'Whisk into baking, dressings, and warming drinks.', 1, 'ground', '\u{1FADA}', '#E0A422', 'Organic', 1, 0, 4.6, 41, [['100g',100,7.50,null,170],['250g',250,15.50,null,85]]],
    ];

    $pStmt = $pdo->prepare('INSERT INTO products
        (category_id,name,slug,short_description,description,origin,usage_tips,is_organic,form,emoji,accent_color,badge,is_featured,is_bestseller,rating_avg,rating_count)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $vStmt = $pdo->prepare('INSERT INTO product_variants (product_id,sku,name,weight_grams,price,compare_at_price,stock_qty) VALUES (?,?,?,?,?,?,?)');
    $imgStmt = $pdo->prepare('INSERT INTO product_images (product_id,path,alt_text,is_primary,sort_order) VALUES (?,?,?,?,?)');

    foreach ($products as $idx => $p) {
        $pStmt->execute([
            $catId[$p[2]], $p[0], $p[1], $p[3], $p[4], $p[5], $p[6], $p[7], $p[8],
            emoji($p[9]), $p[10], $p[11], $p[12], $p[13], $p[14], $p[15],
        ]);
        $pid = (int) $pdo->lastInsertId();
        $skuBase = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $p[1]), 0, 4));
        foreach ($p[16] as $vi => $v) {
            $vStmt->execute([$pid, $skuBase . '-' . ($vi + 1), $v[0], $v[1], $v[2], $v[3], $v[4]]);
        }
        // Two placeholder "images" (rendered as gradient tiles client-side via emoji/colour).
        $imgStmt->execute([$pid, 'tile:' . emoji($p[9]), $p[0], 1, 0]);
        $imgStmt->execute([$pid, 'tile2:' . emoji($p[9]), $p[0] . ' detail', 0, 1]);
    }

    // ---- Reviews ----
    $reviews = [
        [1, 'Aisha', 5, 'Golden everything', 'The colour is unreal and the aroma fills the kitchen. My curries have never looked better.'],
        [1, 'Tom', 5, 'Best turmeric', 'You can tell this is fresh. Worlds apart from supermarket jars.'],
        [4, 'Priya', 5, 'Fragrant and bold', 'Grinding these fresh changed my cooking. Citrusy and punchy.'],
        [6, 'Daniel', 5, 'Restaurant quality', 'This garam masala tastes like my favourite restaurant. Incredible finish.'],
        [5, 'Elena', 5, 'Worth every thread', 'A pinch transforms a dish. Beautiful deep red threads.'],
        [11, 'Sam', 5, 'Perfect gift', 'Gave this to my dad who loves to cook. The box is gorgeous.'],
    ];
    $rStmt = $pdo->prepare('INSERT INTO reviews (product_id,author_name,rating,title,body) VALUES (?,?,?,?,?)');
    foreach ($reviews as $r) {
        $rStmt->execute($r);
    }

    // ---- Coupon ----
    $pdo->prepare('INSERT INTO coupons (code,type,value,min_order_total,is_active) VALUES (?,?,?,?,1)')
        ->execute(['WELCOME10', 'percent', 10, 0]);
    $pdo->prepare('INSERT INTO coupons (code,type,value,min_order_total,is_active) VALUES (?,?,?,?,1)')
        ->execute(['SAVE5', 'fixed', 5, 30]);
}

run_migration();
