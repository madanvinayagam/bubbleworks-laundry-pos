/*
  # Create Orders Table with Round-Off Support

  1. New Tables
    - `orders`
      - `id` (text, primary key) - Order number like VDW-2025-001
      - `customer_name` (text) - Customer name
      - `remark` (text) - Customer remarks or notes
      - `created_at` (timestamptz) - Order creation date
      - `delivery_date` (timestamptz) - Delivery date
      - `items` (jsonb) - Array of order items with id, name, qty, price
      - `round_off` (numeric) - Round-off adjustment amount (can be positive or negative)
      - `total` (numeric) - Total order amount including round-off
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `orders` table
    - Add policies for public access (no auth required for this POS system)
    
  3. Indexes
    - Index on created_at for fast sorting by date

  4. Notes
    - Round-off allows users to adjust the final total for cash handling
    - Positive values increase the total, negative values decrease it
    - The total field includes the round-off adjustment
*/

CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  customer_name text NOT NULL,
  remark text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  delivery_date timestamptz,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  round_off numeric(10,2) DEFAULT 0.00,
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

CREATE POLICY "Allow public update access"
  ON orders
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access"
  ON orders
  FOR DELETE
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
