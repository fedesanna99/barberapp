// Hand-written types matching 001_initial_schema.sql.
// Replace with: npx supabase gen types typescript --project-id YOUR_ID > src/types/supabase.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type BookingStatus = 'pending' | 'confirmed' | 'done' | 'cancelled'
export type UserRole = 'client' | 'barber'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          lat: number | null
          lng: number | null
          created_at: string
        }
        Insert: {
          id: string
          role?: UserRole
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          lat?: number | null
          lng?: number | null
          created_at?: string
        }
        Update: {
          role?: UserRole
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          lat?: number | null
          lng?: number | null
        }
        Relationships: []
      }
      barbers: {
        Row: {
          id: string
          profile_id: string
          shop_name: string | null
          city: string | null
          specialties: string | null
          rating: number
          followers_count: number
          auto_accept: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          shop_name?: string | null
          city?: string | null
          specialties?: string | null
          rating?: number
          followers_count?: number
          auto_accept?: boolean
          created_at?: string
        }
        Update: {
          shop_name?: string | null
          city?: string | null
          specialties?: string | null
          rating?: number
          followers_count?: number
          auto_accept?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'barbers_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      posts: {
        Row: {
          id: string
          barber_id: string
          image_url: string
          caption: string | null
          label: string | null
          likes_count: number
          created_at: string
        }
        Insert: {
          id?: string
          barber_id: string
          image_url: string
          caption?: string | null
          label?: string | null
          likes_count?: number
          created_at?: string
        }
        Update: {
          image_url?: string
          caption?: string | null
          label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'posts_barber_id_fkey'
            columns: ['barber_id']
            isOneToOne: false
            referencedRelation: 'barbers'
            referencedColumns: ['id']
          }
        ]
      }
      follows: {
        Row: {
          follower_id: string
          barber_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          barber_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          barber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'follows_follower_id_fkey'
            columns: ['follower_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'follows_barber_id_fkey'
            columns: ['barber_id']
            isOneToOne: false
            referencedRelation: 'barbers'
            referencedColumns: ['id']
          }
        ]
      }
      likes: {
        Row: {
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          post_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'likes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'likes_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id']
          }
        ]
      }
      availability: {
        Row: {
          id: string
          barber_id: string
          day_of_week: number
          start_time: string
          end_time: string
        }
        Insert: {
          id?: string
          barber_id: string
          day_of_week: number
          start_time: string
          end_time: string
        }
        Update: {
          day_of_week?: number
          start_time?: string
          end_time?: string
        }
        Relationships: [
          {
            foreignKeyName: 'availability_barber_id_fkey'
            columns: ['barber_id']
            isOneToOne: false
            referencedRelation: 'barbers'
            referencedColumns: ['id']
          }
        ]
      }
      bookings: {
        Row: {
          id: string
          client_id: string
          barber_id: string
          date: string
          time_slot: string
          status: BookingStatus
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          barber_id: string
          date: string
          time_slot: string
          status?: BookingStatus
          created_at?: string
        }
        Update: {
          status?: BookingStatus
        }
        Relationships: [
          {
            foreignKeyName: 'bookings_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bookings_barber_id_fkey'
            columns: ['barber_id']
            isOneToOne: false
            referencedRelation: 'barbers'
            referencedColumns: ['id']
          }
        ]
      }
      user_posts: {
        Row: {
          id: string
          user_id: string
          image_url: string
          caption: string | null
          label: string | null
          likes_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          image_url: string
          caption?: string | null
          label?: string | null
          likes_count?: number
          created_at?: string
        }
        Update: {
          image_url?: string
          caption?: string | null
          label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'user_posts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience row types
export type Profile      = Database['public']['Tables']['profiles']['Row']
export type Barber       = Database['public']['Tables']['barbers']['Row']
export type Post         = Database['public']['Tables']['posts']['Row']
export type Follow       = Database['public']['Tables']['follows']['Row']
export type Like         = Database['public']['Tables']['likes']['Row']
export type Availability = Database['public']['Tables']['availability']['Row']
export type Booking      = Database['public']['Tables']['bookings']['Row']
export type UserPost     = Database['public']['Tables']['user_posts']['Row']

// Joined shapes used by hooks
export type BarberWithProfile = Barber & {
  profile: Pick<Profile, 'display_name' | 'avatar_url' | 'lat' | 'lng'>
}

export type PostWithBarber = Post & {
  barbers: Pick<Barber, 'id' | 'city'> & {
    profile: Pick<Profile, 'display_name' | 'avatar_url'>
  }
}
