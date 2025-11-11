-- Migration script to add per-quarter and per-set columns to player_stats table
-- Run this script on your database to support per-period statistics
-- MySQL compatible version (without IF NOT EXISTS)

-- Add technical_fouls column (missing from your schema)
ALTER TABLE player_stats 
ADD COLUMN technical_fouls INT DEFAULT 0;

-- Add basketball per-quarter columns (stored as JSON strings like overtime columns)
ALTER TABLE player_stats 
ADD COLUMN two_points_made_per_quarter JSON DEFAULT ('[]'),
ADD COLUMN three_points_made_per_quarter JSON DEFAULT ('[]'),
ADD COLUMN free_throws_made_per_quarter JSON DEFAULT ('[]'),
ADD COLUMN assists_per_quarter JSON DEFAULT ('[]'),
ADD COLUMN rebounds_per_quarter JSON DEFAULT ('[]'),
ADD COLUMN steals_per_quarter JSON DEFAULT ('[]'),
ADD COLUMN blocks_per_quarter JSON DEFAULT ('[]'),
ADD COLUMN fouls_per_quarter JSON DEFAULT ('[]'),
ADD COLUMN technical_fouls_per_quarter JSON DEFAULT ('[]'),
ADD COLUMN turnovers_per_quarter JSON DEFAULT ('[]');

-- Add volleyball per-set columns
ALTER TABLE player_stats 
ADD COLUMN kills_per_set JSON DEFAULT ('[]'),
ADD COLUMN attack_attempts_per_set JSON DEFAULT ('[]'),
ADD COLUMN attack_errors_per_set JSON DEFAULT ('[]'),
ADD COLUMN serves_per_set JSON DEFAULT ('[]'),
ADD COLUMN service_aces_per_set JSON DEFAULT ('[]'),
ADD COLUMN serve_errors_per_set JSON DEFAULT ('[]'),
ADD COLUMN receptions_per_set JSON DEFAULT ('[]'),
ADD COLUMN reception_errors_per_set JSON DEFAULT ('[]'),
ADD COLUMN digs_per_set JSON DEFAULT ('[]'),
ADD COLUMN volleyball_assists_per_set JSON DEFAULT ('[]'),
ADD COLUMN volleyball_blocks_per_set JSON DEFAULT ('[]'),
ADD COLUMN assist_errors_per_set JSON DEFAULT ('[]');

-- Add overtime technical fouls column
ALTER TABLE player_stats 
ADD COLUMN overtime_technical_fouls JSON DEFAULT ('[]');

-- Note: If you get errors about columns already existing (Duplicate column name), 
-- that means the column already exists and you can safely ignore that error.
-- Just comment out or remove the lines for columns that already exist.

