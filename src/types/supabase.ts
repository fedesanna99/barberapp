// Hand-written types matching 001_initial_schema.sql.
// Replace with: npx supabase gen types typescript --project-id YOUR_ID > src/types/supabase.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// 'declined' = barbiere rifiuta una prenotazione pending (migration 033).
// 'cancelled' resta riservato al cliente che annulla.
export type BookingStatus = 'pending' | 'confirmed' | 'done' | 'cancelled' | 'declined'
// 'failed' = PaymentIntent failed on Stripe (migration 038, webhook).
// 'pending_online' = PI creato, in attesa che il webhook promuova a 'paid'.
// Le transizioni paid/failed/refunded sono enforced server-side (mig. 038 trigger).
export type PaymentStatus = 'pending_cash' | 'pending_online' | 'paid' | 'refunded' | 'failed'
// Task 9 — 'admin' is no longer a value of `profiles.role`; instead `profiles.is_admin`
// is a separate boolean flag. The union here matches the DB CHECK constraint.
export type UserRole = 'client' | 'barber'
export type LogLevel = 'info' | 'warning' | 'error'
export type ConvStatus = 'open' | 'closed'
export type NotificationType = 'admin' | 'system' | 'booking'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          is_admin: boolean
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
          is_admin?: boolean
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          lat?: number | null
          lng?: number | null
          created_at?: string
        }
        Update: {
          role?: UserRole
          is_admin?: boolean
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          lat?: number | null
          lng?: number | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          participant_a: string
          participant_b: string
          status: ConvStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          participant_a: string
          participant_b: string
          status?: ConvStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: ConvStatus
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conversations_participant_a_fkey'
            columns: ['participant_a']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversations_participant_b_fkey'
            columns: ['participant_b']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      direct_messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          body: string
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          body: string
          read_at?: string | null
          created_at?: string
        }
        Update: {
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'direct_messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'direct_messages_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string | null
          title: string
          body_html: string | null
          type: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          recipient_id?: string | null
          title: string
          body_html?: string | null
          type?: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_recipient_id_fkey'
            columns: ['recipient_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      barbers: {
        Row: {
          id: string
          profile_id: string
          shop_name: string | null
          city: string | null
          specialties: string | null
          rating: number
          reviews_count: number
          followers_count: number
          auto_accept: boolean
          accepting_bookings: boolean
          phone: string | null
          address: string | null
          social_link: string | null
          default_slot_minutes: number
          default_price: number
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          shop_name?: string | null
          city?: string | null
          specialties?: string | null
          rating?: number
          reviews_count?: number
          followers_count?: number
          auto_accept?: boolean
          accepting_bookings?: boolean
          phone?: string | null
          address?: string | null
          social_link?: string | null
          default_slot_minutes?: number
          default_price?: number
          created_at?: string
        }
        Update: {
          shop_name?: string | null
          city?: string | null
          specialties?: string | null
          rating?: number
          reviews_count?: number
          followers_count?: number
          auto_accept?: boolean
          accepting_bookings?: boolean
          phone?: string | null
          address?: string | null
          social_link?: string | null
          default_slot_minutes?: number
          default_price?: number
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
          author_id: string
          barber_id: string | null
          image_url: string
          caption: string | null
          label: string | null
          likes_count: number
          comments_count: number
          tagged_profile_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          author_id: string
          barber_id?: string | null
          image_url: string
          caption?: string | null
          label?: string | null
          likes_count?: number
          comments_count?: number
          tagged_profile_id?: string | null
          created_at?: string
        }
        Update: {
          image_url?: string
          caption?: string | null
          label?: string | null
          tagged_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'posts_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
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
          followee_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          followee_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          followee_id?: string
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
            foreignKeyName: 'follows_followee_id_fkey'
            columns: ['followee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
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
      comments: {
        Row: {
          id: string
          post_id: string
          author_id: string
          content: string
          likes_count: number
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          author_id: string
          content: string
          likes_count?: number
          created_at?: string
        }
        Update: {
          content?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comments_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      comment_likes: {
        Row: {
          user_id: string
          comment_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          comment_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          comment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comment_likes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comment_likes_comment_id_fkey'
            columns: ['comment_id']
            isOneToOne: false
            referencedRelation: 'comments'
            referencedColumns: ['id']
          }
        ]
      }
      saved_posts: {
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
            foreignKeyName: 'saved_posts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
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
          break_start: string | null
          break_end: string | null
        }
        Insert: {
          id?: string
          barber_id: string
          day_of_week: number
          start_time: string
          end_time: string
          break_start?: string | null
          break_end?: string | null
        }
        Update: {
          day_of_week?: number
          start_time?: string
          end_time?: string
          break_start?: string | null
          break_end?: string | null
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
      services: {
        Row: {
          id: string
          barber_id: string
          name: string
          price: number
          duration_minutes: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          barber_id: string
          name: string
          price: number
          duration_minutes?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          price?: number
          duration_minutes?: number
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'services_barber_id_fkey'
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
          service_id: string | null
          payment_status: PaymentStatus
          stripe_payment_intent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          barber_id: string
          date: string
          time_slot: string
          status?: BookingStatus
          service_id?: string | null
          payment_status?: PaymentStatus
          stripe_payment_intent_id?: string | null
          created_at?: string
        }
        Update: {
          status?: BookingStatus
          payment_status?: PaymentStatus
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
      app_logs: {
        Row: {
          id: string
          level: LogLevel
          action: string
          message: string
          user_id: string | null
          user_email: string | null
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          level?: LogLevel
          action: string
          message: string
          user_id?: string | null
          user_email?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      support_conversations: {
        Row: {
          id: string
          user_id: string
          status: ConvStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          status?: ConvStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: ConvStatus
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'support_conversations_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      support_messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          is_admin: boolean
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          is_admin?: boolean
          content: string
          created_at?: string
        }
        Update: {
          content?: string
        }
        Relationships: [
          {
            foreignKeyName: 'support_messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'support_conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'support_messages_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      reviews: {
        Row: {
          id: string
          barber_id: string
          client_id: string
          rating: number
          comment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          barber_id: string
          client_id: string
          rating: number
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          rating?: number
          comment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'reviews_barber_id_fkey'
            columns: ['barber_id']
            isOneToOne: false
            referencedRelation: 'barbers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reviews_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'profiles'
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
    Functions: {
      get_admin_users: {
        Args: Record<string, never>
        Returns: {
          id: string
          email: string
          display_name: string
          role: string
          is_admin: boolean
          created_at: string
        }[]
      }
      admin_delete_user: {
        Args: { target_user_id: string }
        Returns: void
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience row types
export type AppLog       = Database['public']['Tables']['app_logs']['Row']
export type Profile      = Database['public']['Tables']['profiles']['Row']
export type Barber       = Database['public']['Tables']['barbers']['Row']
export type Post         = Database['public']['Tables']['posts']['Row']
export type Follow       = Database['public']['Tables']['follows']['Row']
export type Like         = Database['public']['Tables']['likes']['Row']
export type Comment      = Database['public']['Tables']['comments']['Row']
export type CommentLike  = Database['public']['Tables']['comment_likes']['Row']
export type Availability = Database['public']['Tables']['availability']['Row']
export type Booking      = Database['public']['Tables']['bookings']['Row']
export type Service      = Database['public']['Tables']['services']['Row']
export type Review       = Database['public']['Tables']['reviews']['Row']
export type UserPost     = Database['public']['Tables']['user_posts']['Row']
export type SupportConversation = Database['public']['Tables']['support_conversations']['Row']
export type SupportMessage      = Database['public']['Tables']['support_messages']['Row']
export type Notification        = Database['public']['Tables']['notifications']['Row']
export type Conversation        = Database['public']['Tables']['conversations']['Row']
export type DirectMessage       = Database['public']['Tables']['direct_messages']['Row']

// Joined shapes used by hooks
export type BarberWithProfile = Barber & {
  profile: Pick<Profile, 'display_name' | 'avatar_url' | 'lat' | 'lng' | 'role'>
}

export type PostWithBarber = Post & {
  barbers: Pick<Barber, 'id' | 'city'> & {
    profile: Pick<Profile, 'display_name' | 'avatar_url'>
  }
}
