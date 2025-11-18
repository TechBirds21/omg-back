// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';

/**
 * SECURITY: This file has been updated to use proper Supabase authentication.
 * Admin access is now controlled via the user_roles table in the database.
 * 
 * To grant admin access to a user:
 * 1. Create the user account in Supabase Auth
 * 2. Insert a record in the user_roles table:
 *    INSERT INTO user_roles (user_id, role) VALUES ('user-uuid', 'admin');
 */

// Check if current user has admin role
export const isAdmin = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return false;
    }
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Get current user's roles
export const getUserRoles = async (): Promise<string[]> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);
    
    if (error || !data) {
      return [];
    }
    
    return data.map(r => r.role);
  } catch (error) {
    console.error('Error getting user roles:', error);
    return [];
  }
};

// Verify admin password for sensitive operations
export const verifyAdminPassword = async (password: string): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return false;
    }
    
    // Check if user has admin role
    const hasAdminRole = await isAdmin();
    if (!hasAdminRole) {
      return false;
    }
    
    // Verify password by attempting to re-authenticate
    const { data, error } = await supabase.auth.signInWithPassword({
      email: session.user.email!,
      password: password
    });
    
    if (error || !data.user) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error verifying admin password:', error);
    return false;
  }
};
