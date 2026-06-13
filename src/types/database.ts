export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type VotingStatus = 'draft' | 'open' | 'closed' | 'published'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          nickname: string
          avatar_url: string | null
          role: string
          active: boolean
          created_at: string
        }
        Insert: {
          id: string
          name: string
          nickname: string
          avatar_url?: string | null
          role?: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          nickname?: string
          avatar_url?: string | null
          role?: string
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          match_date: string
          location: string | null
          notes: string | null
          created_by: string
          created_at: string
          voting_status: VotingStatus
          voting_closes_at: string | null
          result_published_at: string | null
          score_white: number
          score_black: number
        }
        Insert: {
          id?: string
          match_date: string
          location?: string | null
          notes?: string | null
          created_by: string
          created_at?: string
          voting_status?: VotingStatus
          voting_closes_at?: string | null
          result_published_at?: string | null
          score_white?: number
          score_black?: number
        }
        Update: {
          id?: string
          match_date?: string
          location?: string | null
          notes?: string | null
          created_by?: string
          created_at?: string
          voting_status?: VotingStatus
          voting_closes_at?: string | null
          result_published_at?: string | null
          score_white?: number
          score_black?: number
        }
        Relationships: []
      }
      match_players: {
        Row: {
          id: string
          match_id: string
          player_id: string
          goals: number
          assists: number
          confirmed: boolean
          team: 'white' | 'black' | null
        }
        Insert: {
          id?: string
          match_id: string
          player_id: string
          goals?: number
          assists?: number
          confirmed?: boolean
          team?: 'white' | 'black' | null
        }
        Update: {
          id?: string
          match_id?: string
          player_id?: string
          goals?: number
          assists?: number
          confirmed?: boolean
          team?: 'white' | 'black' | null
        }
        Relationships: [
          {
            foreignKeyName: "match_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          }
        ]
      }
      player_ratings: {
        Row: {
          id: string
          match_id: string
          voter_id: string
          rated_player_id: string
          rating: number
          is_mvp_vote: boolean
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          voter_id: string
          rated_player_id: string
          rating: number
          is_mvp_vote?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          voter_id?: string
          rated_player_id?: string
          rating?: number
          is_mvp_vote?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_ratings_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_ratings_rated_player_id_fkey"
            columns: ["rated_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      player_stats: {
        Row: {
          id: string
          name: string
          nickname: string
          avatar_url: string | null
          total_goals: number
          total_assists: number
          total_matches: number
          total_mvp_votes: number
          avg_rating: number | null
          total_score: number
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_match_participant: {
        Args: { p_match_id: string }
        Returns: boolean
      }
      get_voting_deadline: {
        Args: { match_date: string }
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type MatchPlayer = Database['public']['Tables']['match_players']['Row']
export type PlayerRating = Database['public']['Tables']['player_ratings']['Row']
export type PlayerStats = Database['public']['Views']['player_stats']['Row']

export type MatchPlayerWithProfile = MatchPlayer & { profiles: Profile }

export type MatchWithPlayers = Match & {
  match_players: MatchPlayerWithProfile[]
}
