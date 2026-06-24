import { Order } from "@/types";
import { supabase } from "@/lib/supabase";

export async function removeAllOrders() {
  const { error } = await supabase
    .from('orders')
    .delete()
    .neq('id', '');

  if (error) throw new Error("Failed to delete all orders");
}

export async function loadOrders(): Promise<Order[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(order => ({
      id: order.id,
      customerName: order.customer_name,
      remark: order.remark || '',
      createdAt: order.created_at,
      deliveryDate: order.delivery_date || '',
      items: order.items || [],
      roundOff: order.round_off || 0
    }));
  } catch (error) {
    console.error("Failed to load orders:", error);
    return [];
  }
}

export async function addOrder(order: Order) {
  try {
    const subtotal = order.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const roundOff = order.roundOff || 0;
    const total = subtotal + roundOff;

    const { error } = await supabase
      .from('orders')
      .insert({
        id: order.id,
        customer_name: order.customerName,
        remark: order.remark || null,
        created_at: order.createdAt,
        delivery_date: order.deliveryDate || null,
        items: order.items,
        round_off: roundOff,
        total: total
      });

    if (error) throw error;
  } catch (error) {
    console.error("Failed to add order:", error);
    throw error;
  }
}

export async function removeOrder(id: string) {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id);

  if (error) throw new Error("Failed to delete order");
}