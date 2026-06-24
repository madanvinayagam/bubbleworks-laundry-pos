/*
  # Create Orders Table

  1. New Tables
    - `orders`
      - `id` (text, primary key) - Order number like VDW-2025-001
      - `customer_name` (text) - Customer name
      - `phone` (text) - Customer phone number
      - `created_at` (timestamptz) - Order creation date
      - `delivery_date` (timestamptz) - Delivery date
      - `items` (jsonb) - Array of order items with id, name, qty, price
      - `total` (numeric) - Total order amount
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `orders` table
    - Add policy for public access (no auth required for this POS system)
*/

CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  customer_name text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivery_date timestamptz,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(10,2) NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON orders
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert access"
  ON orders
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public delete access"
  ON orders
  FOR DELETE
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);