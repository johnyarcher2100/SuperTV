/**
 * Supabase Client for SuperTV
 * Handles database operations for user data, favorites, and watch history
 */

import { createLogger } from './logger.js';

const logger = createLogger('SupabaseClient');

// Supabase configuration from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Supabase Client Class
 * Provides methods for interacting with Supabase backend
 */
class SupabaseClient {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.isInitialized = false;
    }

    /**
     * Initialize Supabase client
     * Dynamically imports Supabase SDK to reduce initial bundle size
     */
    async init() {
        if (this.isInitialized) {
            return this.supabase;
        }

        try {
            logger.debug('Initializing Supabase client...');

            // Validate environment variables
            if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
                throw new Error('Supabase credentials not found in environment variables');
            }

            // Dynamically import Supabase SDK
            const { createClient } = await import('@supabase/supabase-js');

            // Create Supabase client
            this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                }
            });

            // Check for existing session
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                this.currentUser = session.user;
                logger.info('User session restored:', this.currentUser.id);
            }

            // Listen for auth state changes
            this.supabase.auth.onAuthStateChange((event, session) => {
                logger.debug('Auth state changed:', event);
                this.currentUser = session?.user || null;
            });

            this.isInitialized = true;
            logger.info('Supabase client initialized successfully');

            return this.supabase;
        } catch (error) {
            logger.error('Failed to initialize Supabase:', error);
            throw error;
        }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.currentUser;
    }

    /**
     * Sign in anonymously (for guest users)
     */
    async signInAnonymously() {
        try {
            await this.init();

            const { data, error } = await this.supabase.auth.signInAnonymously();

            if (error) throw error;

            this.currentUser = data.user;
            logger.info('Anonymous sign in successful:', this.currentUser.id);

            return data;
        } catch (error) {
            logger.error('Anonymous sign in failed:', error);
            throw error;
        }
    }

    /**
     * Sign in with email (optional for future use)
     */
    async signInWithEmail(email, password) {
        try {
            await this.init();

            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            this.currentUser = data.user;
            logger.info('Email sign in successful:', this.currentUser.id);

            return data;
        } catch (error) {
            logger.error('Email sign in failed:', error);
            throw error;
        }
    }

    /**
     * Sign out
     */
    async signOut() {
        try {
            await this.init();

            const { error } = await this.supabase.auth.signOut();

            if (error) throw error;

            this.currentUser = null;
            logger.info('Sign out successful');
        } catch (error) {
            logger.error('Sign out failed:', error);
            throw error;
        }
    }

    /**
     * Save user favorite channel
     */
    async saveFavorite(channelId, channelName, channelUrl) {
        try {
            await this.ensureAuthenticated();

            const { data, error } = await this.supabase
                .from('favorites')
                .upsert({
                    user_id: this.currentUser.id,
                    channel_id: channelId,
                    channel_name: channelName,
                    channel_url: channelUrl,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,channel_id'
                });

            if (error) throw error;

            logger.debug('Favorite saved:', channelName);
            return data;
        } catch (error) {
            logger.error('Failed to save favorite:', error);
            throw error;
        }
    }

    /**
     * Remove favorite channel
     */
    async removeFavorite(channelId) {
        try {
            await this.ensureAuthenticated();

            const { error } = await this.supabase
                .from('favorites')
                .delete()
                .eq('user_id', this.currentUser.id)
                .eq('channel_id', channelId);

            if (error) throw error;

            logger.debug('Favorite removed:', channelId);
        } catch (error) {
            logger.error('Failed to remove favorite:', error);
            throw error;
        }
    }

    /**
     * Get all user favorites
     */
    async getFavorites() {
        try {
            await this.ensureAuthenticated();

            const { data, error } = await this.supabase
                .from('favorites')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            logger.debug('Favorites loaded:', data?.length || 0);
            return data || [];
        } catch (error) {
            logger.error('Failed to get favorites:', error);
            return [];
        }
    }

    /**
     * Save watch history
     */
    async saveWatchHistory(channelId, channelName, channelUrl, duration = 0) {
        try {
            await this.ensureAuthenticated();

            const { data, error } = await this.supabase
                .from('watch_history')
                .insert({
                    user_id: this.currentUser.id,
                    channel_id: channelId,
                    channel_name: channelName,
                    channel_url: channelUrl,
                    duration: duration,
                    watched_at: new Date().toISOString()
                });

            if (error) throw error;

            logger.debug('Watch history saved:', channelName);
            return data;
        } catch (error) {
            logger.error('Failed to save watch history:', error);
            // Don't throw - watch history is not critical
        }
    }

    /**
     * Get watch history
     */
    async getWatchHistory(limit = 50) {
        try {
            await this.ensureAuthenticated();

            const { data, error } = await this.supabase
                .from('watch_history')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('watched_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            logger.debug('Watch history loaded:', data?.length || 0);
            return data || [];
        } catch (error) {
            logger.error('Failed to get watch history:', error);
            return [];
        }
    }

    /**
     * Save user settings
     */
    async saveSettings(settings) {
        try {
            await this.ensureAuthenticated();

            const { data, error } = await this.supabase
                .from('user_settings')
                .upsert({
                    user_id: this.currentUser.id,
                    settings: settings,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (error) throw error;

            logger.debug('Settings saved to cloud');
            return data;
        } catch (error) {
            logger.error('Failed to save settings:', error);
            throw error;
        }
    }

    /**
     * Get user settings
     */
    async getSettings() {
        try {
            await this.ensureAuthenticated();

            const { data, error } = await this.supabase
                .from('user_settings')
                .select('settings')
                .eq('user_id', this.currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                throw error;
            }

            logger.debug('Settings loaded from cloud');
            return data?.settings || null;
        } catch (error) {
            logger.error('Failed to get settings:', error);
            return null;
        }
    }

    /**
     * Ensure user is authenticated, sign in anonymously if not
     */
    async ensureAuthenticated() {
        await this.init();

        if (!this.isAuthenticated()) {
            logger.debug('User not authenticated, signing in anonymously...');
            await this.signInAnonymously();
        }
    }
}

// Create singleton instance
const supabaseClient = new SupabaseClient();

// Export singleton
export default supabaseClient;
export { SupabaseClient };

