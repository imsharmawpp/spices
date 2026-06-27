<?php
declare(strict_types=1);

/**
 * Build a ready-to-import MySQL dump (schema + seed data) for phpMyAdmin / Hostinger.
 * Reads the seeded SQLite database and writes database/spices_mysql.sql.
 *
 * Usage: php database/export_mysql.php
 * (Run after the SQLite demo DB has been seeded.)
 */

$sqlitePath = __DIR__ . '/../storage/database.sqlite';
if (!is_file($sqlitePath)) {
    fwrite(STDERR, "SQLite DB not found. Run: php database/migrate.php first.\n");
    exit(1);
}

$src = new PDO('sqlite:' . $sqlitePath, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

$schema = file_get_contents(__DIR__ . '/schema.mysql.sql');

// Tables to export, in dependency-friendly order.
$tables = [
    'settings', 'users', 'categories', 'products', 'product_variants',
    'product_images', 'reviews', 'coupons',
];

function q(PDO $pdo, $v): string
{
    if ($v === null) {
        return 'NULL';
    }
    return $pdo->quote((string) $v);
}

$out = "-- Saffra Spices — MySQL import (schema + demo catalog)\n";
$out .= "-- Import into your database (e.g. u770423744_spices) via phpMyAdmin > Import.\n";
$out .= "-- Generated from the seed catalog.\n\n";
$out .= $schema . "\n\n";
$out .= "SET FOREIGN_KEY_CHECKS = 0;\n\n";

foreach ($tables as $table) {
    $rows = $src->query("SELECT * FROM {$table}")->fetchAll(PDO::FETCH_ASSOC);
    if (!$rows) {
        continue;
    }
    $cols = array_keys($rows[0]);
    $colList = implode(', ', array_map(fn($c) => "`{$c}`", $cols));
    $out .= "-- {$table} (" . count($rows) . " rows)\n";
    foreach ($rows as $row) {
        $vals = implode(', ', array_map(fn($c) => q($src, $row[$c]), $cols));
        $out .= "INSERT INTO `{$table}` ({$colList}) VALUES ({$vals});\n";
    }
    $out .= "\n";
}

$out .= "SET FOREIGN_KEY_CHECKS = 1;\n";

file_put_contents(__DIR__ . '/spices_mysql.sql', $out);
echo "Wrote database/spices_mysql.sql (" . number_format(strlen($out)) . " bytes)\n";
