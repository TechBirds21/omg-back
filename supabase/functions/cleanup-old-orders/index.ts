import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })


    // Calculate date 1 week ago (7 days)
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const cutoffDate = oneWeekAgo.toISOString()


    // First, get the orders that will be deleted for logging
    const { data: ordersToDelete, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_id, status, created_at, customer_name, amount')
      .in('status', ['pending', 'cancelled'])
      .lt('created_at', cutoffDate)

    if (fetchError) {
      throw fetchError
    }

    if (!ordersToDelete || ordersToDelete.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No old orders found to delete',
          deleted_count: 0,
          cutoff_date: cutoffDate
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200 
        }
      )
    }

    ordersToDelete.forEach(order => {
    })

    // Delete the old pending/cancelled orders in batches
    let totalDeleted = 0
    const batchSize = 500
    
    for (let i = 0; i < ordersToDelete.length; i += batchSize) {
      const batch = ordersToDelete.slice(i, i + batchSize)
      const batchIds = batch.map(order => order.id)
      
      const { data: deletedBatch, error: deleteError } = await supabase
        .from('orders')
        .delete()
        .in('id', batchIds)
        .select('id, order_id')

      if (deleteError) {
        throw deleteError
      }

      const batchDeleted = deletedBatch?.length || 0
      totalDeleted += batchDeleted
    }


    // Log the cleanup activity
    const { error: logError } = await supabase
      .from('visits')
      .insert({
        path: '/cleanup/old-orders',
        user_agent: 'Supabase Edge Function - Order Cleanup',
        session_id: `cleanup-${Date.now()}`,
        visitor_id: `system-cleanup`,
        referrer: `Automated cleanup deleted ${totalDeleted} orders older than ${cutoffDate}`
      })

    if (logError) {
      // Don't fail the entire operation for logging issues
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully deleted ${totalDeleted} old pending/cancelled orders`,
        deleted_count: totalDeleted,
        cutoff_date: cutoffDate,
        deleted_orders: ordersToDelete.map(o => ({
          order_id: o.order_id,
          status: o.status,
          created_at: o.created_at
        }))
      }),
      { 
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200 
      }
    )

  } catch (error) {
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Failed to cleanup old orders'
      }),
      { 
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500 
      }
    )
  }
})


