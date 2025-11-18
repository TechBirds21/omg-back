export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          admin_password_hash: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          admin_password_hash?: string | null
          created_at?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          admin_password_hash?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_status: {
        Row: {
          id: string
          is_online: boolean | null
          last_seen: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          is_online?: boolean | null
          last_seen?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          is_online?: boolean | null
          last_seen?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          cover_image_index: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          images: string[] | null
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          cover_image_index?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          cover_image_index?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          sender_name: string | null
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          sender_name?: string | null
          sender_type: string
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          sender_name?: string | null
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "chat_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_tickets: {
        Row: {
          created_at: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          inquiry_type: string
          order_details: Json | null
          order_id: string | null
          status: string
          ticket_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          inquiry_type: string
          order_details?: Json | null
          order_id?: string | null
          status?: string
          ticket_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          inquiry_type?: string
          order_details?: Json | null
          order_id?: string | null
          status?: string
          ticket_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: string | null
          subject: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          city: string | null
          created_at: string | null
          customer_id: string
          email: string
          id: string
          joined_date: string | null
          last_order_date: string | null
          location: string | null
          name: string
          phone: string | null
          state: string | null
          status: string | null
          tier: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          customer_id: string
          email: string
          id?: string
          joined_date?: string | null
          last_order_date?: string | null
          location?: string | null
          name: string
          phone?: string | null
          state?: string | null
          status?: string | null
          tier?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          customer_id?: string
          email?: string
          id?: string
          joined_date?: string | null
          last_order_date?: string | null
          location?: string | null
          name?: string
          phone?: string | null
          state?: string | null
          status?: string | null
          tier?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          actual_delivery_date: string | null
          courier: string | null
          courier_phone: string | null
          courier_service: string | null
          created_at: string | null
          customer_address: string
          customer_name: string
          customer_phone: string | null
          delivered_date: string | null
          delivery_id: string
          delivery_notes: string | null
          delivery_timestamp: string | null
          estimated_delivery: string | null
          estimated_delivery_date: string | null
          id: string
          order_id: string | null
          pickup_date: string | null
          pickup_timestamp: string | null
          product_name: string
          status: string | null
          tracking_id: string | null
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          courier?: string | null
          courier_phone?: string | null
          courier_service?: string | null
          created_at?: string | null
          customer_address: string
          customer_name: string
          customer_phone?: string | null
          delivered_date?: string | null
          delivery_id: string
          delivery_notes?: string | null
          delivery_timestamp?: string | null
          estimated_delivery?: string | null
          estimated_delivery_date?: string | null
          id?: string
          order_id?: string | null
          pickup_date?: string | null
          pickup_timestamp?: string | null
          product_name: string
          status?: string | null
          tracking_id?: string | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          courier?: string | null
          courier_phone?: string | null
          courier_service?: string | null
          created_at?: string | null
          customer_address?: string
          customer_name?: string
          customer_phone?: string | null
          delivered_date?: string | null
          delivery_id?: string
          delivery_notes?: string | null
          delivery_timestamp?: string | null
          estimated_delivery?: string | null
          estimated_delivery_date?: string | null
          id?: string
          order_id?: string | null
          pickup_date?: string | null
          pickup_timestamp?: string | null
          product_name?: string
          status?: string | null
          tracking_id?: string | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_tracking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_areas: {
        Row: {
          area: string | null
          city: string | null
          country: string | null
          id: number
          pincode: number
          state: string | null
        }
        Insert: {
          area?: string | null
          city?: string | null
          country?: string | null
          id?: number
          pincode: number
          state?: string | null
        }
        Update: {
          area?: string | null
          city?: string | null
          country?: string | null
          id?: number
          pincode?: number
          state?: string | null
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          content: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          section_type: string
          sort_order: number | null
          subtitle: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          section_type: string
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          section_type?: string
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          category: string
          colors: Json | null
          cost_price: number | null
          created_at: string | null
          current_stock: number | null
          id: string
          images: string[] | null
          last_restocked: string | null
          maximum_stock: number | null
          minimum_stock: number | null
          product_id: string | null
          product_name: string
          selling_price: number
          sku: string
          status: string | null
          supplier: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          colors?: Json | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          images?: string[] | null
          last_restocked?: string | null
          maximum_stock?: number | null
          minimum_stock?: number | null
          product_id?: string | null
          product_name: string
          selling_price: number
          sku: string
          status?: string | null
          supplier?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          colors?: Json | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          images?: string[] | null
          last_restocked?: string | null
          maximum_stock?: number | null
          minimum_stock?: number | null
          product_id?: string | null
          product_name?: string
          selling_price?: number
          sku?: string
          status?: string | null
          supplier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          applicable_categories: string[] | null
          applicable_products: string[] | null
          conditions: Json
          created_at: string | null
          current_uses: number | null
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          end_date: string | null
          id: string
          is_active: boolean | null
          max_uses_per_customer: number | null
          maximum_quantity: number | null
          minimum_quantity: number | null
          offer_type: string
          priority: number | null
          start_date: string | null
          title: string
          total_max_uses: number | null
          updated_at: string | null
        }
        Insert: {
          applicable_categories?: string[] | null
          applicable_products?: string[] | null
          conditions?: Json
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_uses_per_customer?: number | null
          maximum_quantity?: number | null
          minimum_quantity?: number | null
          offer_type?: string
          priority?: number | null
          start_date?: string | null
          title: string
          total_max_uses?: number | null
          updated_at?: string | null
        }
        Update: {
          applicable_categories?: string[] | null
          applicable_products?: string[] | null
          conditions?: Json
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_uses_per_customer?: number | null
          maximum_quantity?: number | null
          minimum_quantity?: number | null
          offer_type?: string
          priority?: number | null
          start_date?: string | null
          title?: string
          total_max_uses?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          applied_offer: Json | null
          created_at: string | null
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          inventory_decremented: boolean | null
          order_id: string
          payment_gateway_response: Json | null
          payment_method: string | null
          payment_status: string | null
          product_colors: string[] | null
          product_id: string | null
          product_name: string
          product_sizes: string[] | null
          quantity: number | null
          saree_id: string | null
          shipping_address: string | null
          status: string | null
          transaction_id: string | null
          updated_at: string | null
          vendor_code: string | null
          vendor_id: string | null
        }
        Insert: {
          amount: number
          applied_offer?: Json | null
          created_at?: string | null
          customer_email: string
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          inventory_decremented?: boolean | null
          order_id: string
          payment_gateway_response?: Json | null
          payment_method?: string | null
          payment_status?: string | null
          product_colors?: string[] | null
          product_id?: string | null
          product_name: string
          product_sizes?: string[] | null
          quantity?: number | null
          saree_id?: string | null
          shipping_address?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          vendor_code?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          applied_offer?: Json | null
          created_at?: string | null
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          inventory_decremented?: boolean | null
          order_id?: string
          payment_gateway_response?: Json | null
          payment_method?: string | null
          payment_status?: string | null
          product_colors?: string[] | null
          product_id?: string | null
          product_name?: string
          product_sizes?: string[] | null
          quantity?: number | null
          saree_id?: string | null
          shipping_address?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          vendor_code?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_config: {
        Row: {
          admin_password_hash: string | null
          configuration: Json | null
          created_at: string | null
          description: string | null
          display_name: string
          encrypted_keys: Json | null
          id: string
          is_enabled: boolean | null
          is_primary: boolean | null
          payment_method: string
          updated_at: string | null
        }
        Insert: {
          admin_password_hash?: string | null
          configuration?: Json | null
          created_at?: string | null
          description?: string | null
          display_name: string
          encrypted_keys?: Json | null
          id?: string
          is_enabled?: boolean | null
          is_primary?: boolean | null
          payment_method: string
          updated_at?: string | null
        }
        Update: {
          admin_password_hash?: string | null
          configuration?: Json | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          encrypted_keys?: Json | null
          id?: string
          is_enabled?: boolean | null
          is_primary?: boolean | null
          payment_method?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          best_seller: boolean | null
          best_seller_rank: number | null
          care_instructions: string | null
          category_id: string | null
          color_images: Json | null
          color_size_stock: Json | null
          color_stock: Json | null
          colors: string[] | null
          cover_image_index: number | null
          created_at: string | null
          description: string | null
          fabric: string | null
          featured: boolean | null
          id: string
          images: string[] | null
          is_active: boolean | null
          meta_description: string | null
          meta_title: string | null
          name: string
          new_collection: boolean | null
          new_collection_end_date: string | null
          new_collection_start_date: string | null
          original_price: number | null
          price: number
          saree_id: string | null
          sizes: string[] | null
          sku: string
          slug: string | null
          sort_order: number | null
          stock_status: string | null
          stretch_variants: Json | null
          total_stock: number | null
          updated_at: string | null
          vendor_code: string | null
          vendor_id: string | null
        }
        Insert: {
          best_seller?: boolean | null
          best_seller_rank?: number | null
          care_instructions?: string | null
          category_id?: string | null
          color_images?: Json | null
          color_size_stock?: Json | null
          color_stock?: Json | null
          colors?: string[] | null
          cover_image_index?: number | null
          created_at?: string | null
          description?: string | null
          fabric?: string | null
          featured?: boolean | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          new_collection?: boolean | null
          new_collection_end_date?: string | null
          new_collection_start_date?: string | null
          original_price?: number | null
          price: number
          saree_id?: string | null
          sizes?: string[] | null
          sku: string
          slug?: string | null
          sort_order?: number | null
          stock_status?: string | null
          stretch_variants?: Json | null
          total_stock?: number | null
          updated_at?: string | null
          vendor_code?: string | null
          vendor_id?: string | null
        }
        Update: {
          best_seller?: boolean | null
          best_seller_rank?: number | null
          care_instructions?: string | null
          category_id?: string | null
          color_images?: Json | null
          color_size_stock?: Json | null
          color_stock?: Json | null
          colors?: string[] | null
          cover_image_index?: number | null
          created_at?: string | null
          description?: string | null
          fabric?: string | null
          featured?: boolean | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          new_collection?: boolean | null
          new_collection_end_date?: string | null
          new_collection_start_date?: string | null
          original_price?: number | null
          price?: number
          saree_id?: string | null
          sizes?: string[] | null
          sku?: string
          slug?: string | null
          sort_order?: number | null
          stock_status?: string | null
          stretch_variants?: Json | null
          total_stock?: number | null
          updated_at?: string | null
          vendor_code?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          content: string
          created_at: string | null
          customer_location: string | null
          customer_name: string
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          rating: number | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          customer_location?: string | null
          customer_name: string
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          rating?: number | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          customer_location?: string | null
          customer_name?: string
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          rating?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_orders: {
        Row: {
          contact_person: string | null
          cover_image_index: number | null
          created_at: string | null
          customer_address: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          order_date: string | null
          order_id: string | null
          order_number: string | null
          order_status: string | null
          product_colors: string[] | null
          product_images: string[] | null
          product_name: string | null
          quantity: number | null
          saree_id: string | null
          updated_at: string | null
          vendor_address: string | null
          vendor_city: string | null
          vendor_code: string | null
          vendor_email: string | null
          vendor_id: string | null
          vendor_name: string | null
          vendor_phone: string | null
          vendor_ref: string | null
          vendor_state: string | null
        }
        Insert: {
          contact_person?: string | null
          cover_image_index?: number | null
          created_at?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          order_date?: string | null
          order_id?: string | null
          order_number?: string | null
          order_status?: string | null
          product_colors?: string[] | null
          product_images?: string[] | null
          product_name?: string | null
          quantity?: number | null
          saree_id?: string | null
          updated_at?: string | null
          vendor_address?: string | null
          vendor_city?: string | null
          vendor_code?: string | null
          vendor_email?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
          vendor_phone?: string | null
          vendor_ref?: string | null
          vendor_state?: string | null
        }
        Update: {
          contact_person?: string | null
          cover_image_index?: number | null
          created_at?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          order_date?: string | null
          order_id?: string | null
          order_number?: string | null
          order_status?: string | null
          product_colors?: string[] | null
          product_images?: string[] | null
          product_name?: string | null
          quantity?: number | null
          saree_id?: string | null
          updated_at?: string | null
          vendor_address?: string | null
          vendor_city?: string | null
          vendor_code?: string | null
          vendor_email?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
          vendor_phone?: string | null
          vendor_ref?: string | null
          vendor_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_tracking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          pincode: string | null
          specialization: string | null
          state: string | null
          updated_at: string | null
          vendor_code: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          pincode?: string | null
          specialization?: string | null
          state?: string | null
          updated_at?: string | null
          vendor_code: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          pincode?: string | null
          specialization?: string | null
          state?: string | null
          updated_at?: string | null
          vendor_code?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          id: string
          ip: string | null
          path: string | null
          referrer: string | null
          session_id: string | null
          state: string | null
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          state?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          state?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      zoho_oauth_tokens: {
        Row: {
          access_token: string
          api_domain: string | null
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string
          token_type: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          api_domain?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          token_type?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          api_domain?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          token_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      order_tracking: {
        Row: {
          courier_service: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_id: string | null
          delivery_notes: string | null
          delivery_status: string | null
          delivery_timestamp: string | null
          estimated_delivery_date: string | null
          id: string | null
          last_updated: string | null
          order_date: string | null
          order_id: string | null
          order_status: string | null
          payment_status: string | null
          pickup_timestamp: string | null
          product_colors: string[] | null
          product_name: string | null
          product_sizes: string[] | null
          quantity: number | null
          shipping_address: string | null
          tracking_number: string | null
        }
        Relationships: []
      }
      payment_method_status: {
        Row: {
          created_at: string | null
          credentials_status: string | null
          current_status: string | null
          display_name: string | null
          is_enabled: boolean | null
          is_primary: boolean | null
          payment_method: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credentials_status?: never
          current_status?: never
          display_name?: string | null
          is_enabled?: boolean | null
          is_primary?: boolean | null
          payment_method?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credentials_status?: never
          current_status?: never
          display_name?: string | null
          is_enabled?: boolean | null
          is_primary?: boolean | null
          payment_method?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_stock_summary: {
        Row: {
          category_name: string | null
          color_stock: Json | null
          colors: string[] | null
          featured: boolean | null
          id: string | null
          is_active: boolean | null
          low_stock_colors: number | null
          name: string | null
          sku: string | null
          sold_out_colors: number | null
          stock_display: string | null
          stock_status: string | null
          total_stock: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_product_stock: {
        Args: {
          color_name_param: string
          new_stock_param: number
          product_id_param: string
        }
        Returns: boolean
      }
      calculate_cart_offer_price: {
        Args: {
          offer_conditions_param: Json
          original_price_param: number
          total_quantity_param: number
        }
        Returns: {
          applicable_tier: Json
          savings_per_unit: number
          total_price: number
          total_savings: number
          unit_price: number
        }[]
      }
      calculate_offer_price: {
        Args: {
          original_price_param: number
          product_name_param: string
          quantity_param: number
        }
        Returns: Json
      }
      calculate_total_stock: {
        Args: { color_stock_data: Json }
        Returns: number
      }
      decrease_product_stock: {
        Args: {
          colors_param: string[]
          product_name_param: string
          quantity_param: number
        }
        Returns: boolean
      }
      decrypt_payment_keys: { Args: { encrypted_data: Json }; Returns: Json }
      determine_stock_status: {
        Args: { total_stock_count: number }
        Returns: string
      }
      disable_easebuzz: { Args: never; Returns: string }
      enable_easebuzz: { Args: never; Returns: string }
      encrypt_payment_keys: { Args: { keys_data: Json }; Returns: Json }
      generate_saree_id: {
        Args: { vendor_code_param: string }
        Returns: string
      }
      generate_ticket_id: { Args: never; Returns: string }
      generate_vendor_order_id: {
        Args: { vendor_code_param: string }
        Returns: string
      }
      get_active_offers: {
        Args: never
        Returns: {
          conditions: Json
          description: string
          discount_amount: number
          discount_percentage: number
          end_date: string
          id: string
          maximum_quantity: number
          minimum_quantity: number
          offer_type: string
          start_date: string
          title: string
        }[]
      }
      get_active_offers_for_product: {
        Args: { product_name_param: string }
        Returns: {
          conditions: Json
          description: string
          id: string
          offer_type: string
          priority: number
          title: string
        }[]
      }
      get_active_payment_method: {
        Args: never
        Returns: {
          configuration: Json
          description: string
          display_name: string
          encrypted_keys: Json
          is_enabled: boolean
          is_primary: boolean
          payment_method: string
          schedule_enabled: boolean
          schedule_from_date: string
          schedule_timezone: string
          schedule_to_date: string
        }[]
      }
      get_active_payment_methods: {
        Args: never
        Returns: {
          configuration: Json
          created_at: string
          description: string
          display_name: string
          encrypted_keys: Json
          id: string
          is_enabled: boolean
          is_primary: boolean
          payment_method: string
          updated_at: string
        }[]
      }
      get_available_colors: {
        Args: { product_color_stock: Json }
        Returns: string[]
      }
      get_available_sizes_for_color: {
        Args: { color_name: string; product_color_size_stock: Json }
        Returns: string[]
      }
      get_color_size_stock: {
        Args: {
          color_name: string
          product_color_size_stock: Json
          size_name: string
        }
        Returns: number
      }
      get_color_stock: {
        Args: { color_name: string; product_color_stock: Json }
        Returns: number
      }
      get_delivery_info_by_pincode: {
        Args: { input_pincode: string }
        Returns: {
          area: string
          city: string
          country: string
          delivery_charge: number
          estimated_days: number
          is_cod_available: boolean
          pincode: string
          state: string
        }[]
      }
      get_next_order_number: {
        Args: { month_code_param: string; vendor_prefix_param: string }
        Returns: number
      }
      get_zoho_access_token: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_stock: { Args: { product_color_stock: Json }; Returns: boolean }
      is_dress_product: {
        Args: { product_color_size_stock: Json }
        Returns: boolean
      }
      is_payment_method_active: { Args: { p_method: string }; Returns: boolean }
      manual_decrement_stock: {
        Args: {
          color_param: string
          product_id_param: string
          quantity_param: number
        }
        Returns: boolean
      }
      switch_payment_method: {
        Args: { target_method: string }
        Returns: string
      }
      sync_missing_vendor_orders: { Args: never; Returns: undefined }
      track_order: {
        Args: {
          _customer_email?: string
          _customer_phone?: string
          _order_id: string
        }
        Returns: {
          amount: number
          created_at: string
          customer_name: string
          order_id: string
          payment_status: string
          product_name: string
          quantity: number
          status: string
        }[]
      }
      update_color_size_stock: {
        Args: {
          color_name: string
          new_stock: number
          product_id_param: string
          size_name: string
        }
        Returns: boolean
      }
      update_zoho_token: {
        Args: {
          p_access_token: string
          p_expires_in: number
          p_refresh_token: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
