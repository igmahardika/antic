-- Migration: Create customers table
-- Created: 2024-12-20
-- Description: Initialize customers table for customer data management

CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(255) PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    jenis_klien VARCHAR(100),
    layanan VARCHAR(100),
    kategori VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_nama (nama),
    INDEX idx_jenis_klien (jenis_klien),
    INDEX idx_layanan (layanan),
    INDEX idx_kategori (kategori)
) ENGINE=InnoDB;