import type { Vertical } from '@/lib/types/database.types'

/**
 * The Groups/Community module is built church-first, but the same core
 * (organizations → groups → members → events → RSVP/attendance) fits any org
 * that runs recurring groups: businesses (teams), nonprofits
 * (chapters/programs), schools (classes/clubs), and community organizations
 * (clubs/leagues).
 *
 * A `vertical` on the organization picks the vocabulary shown in the UI — the
 * data model underneath never changes.
 */

export interface Terminology {
  label: string
  orgNoun: string
  ministryNoun: string
  ministryNounPlural: string
  groupNoun: string
  groupNounPlural: string
  leaderNoun: string
  leaderNounPlural: string
  memberNoun: string
  memberNounPlural: string
  eventNoun: string
  eventNounPlural: string
  groupTypes: { value: string; label: string }[]
  tagline: string
}

export const TERMINOLOGY: Record<Vertical, Terminology> = {
  church: {
    label: 'Church or ministry',
    orgNoun: 'Church',
    ministryNoun: 'Ministry',
    ministryNounPlural: 'Ministries',
    groupNoun: 'Group',
    groupNounPlural: 'Groups',
    leaderNoun: 'Leader',
    leaderNounPlural: 'Leaders',
    memberNoun: 'Member',
    memberNounPlural: 'Members',
    eventNoun: 'Event',
    eventNounPlural: 'Events',
    tagline: 'Automate the logistics. Remember the context. Strengthen the relationship.',
    groupTypes: [
      { value: 'life_group', label: 'Life Group' },
      { value: 'bible_study', label: 'Bible Study' },
      { value: 'mens', label: "Men's Group" },
      { value: 'womens', label: "Women's Group" },
      { value: 'youth', label: 'Youth Group' },
      { value: 'prayer', label: 'Prayer Group' },
      { value: 'discipleship', label: 'Discipleship Group' },
      { value: 'mission_team', label: 'Mission Team' },
      { value: 'volunteer_team', label: 'Volunteer Team' },
    ],
  },
  nonprofit: {
    label: 'Nonprofit or association',
    orgNoun: 'Organization',
    ministryNoun: 'Program',
    ministryNounPlural: 'Programs',
    groupNoun: 'Chapter',
    groupNounPlural: 'Chapters',
    leaderNoun: 'Coordinator',
    leaderNounPlural: 'Coordinators',
    memberNoun: 'Member',
    memberNounPlural: 'Members',
    eventNoun: 'Event',
    eventNounPlural: 'Events',
    tagline: 'Automate the logistics. Remember the context. Strengthen every relationship.',
    groupTypes: [
      { value: 'chapter', label: 'Chapter' },
      { value: 'committee', label: 'Committee' },
      { value: 'volunteer_team', label: 'Volunteer Team' },
      { value: 'fundraising_team', label: 'Fundraising Team' },
      { value: 'board', label: 'Board' },
      { value: 'support_group', label: 'Support Group' },
    ],
  },
  business: {
    label: 'Business or team',
    orgNoun: 'Company',
    ministryNoun: 'Department',
    ministryNounPlural: 'Departments',
    groupNoun: 'Team',
    groupNounPlural: 'Teams',
    leaderNoun: 'Manager',
    leaderNounPlural: 'Managers',
    memberNoun: 'Teammate',
    memberNounPlural: 'Teammates',
    eventNoun: 'Meeting',
    eventNounPlural: 'Meetings',
    tagline: 'Automate the logistics. Remember the context. Keep every team aligned.',
    groupTypes: [
      { value: 'team', label: 'Team' },
      { value: 'project_group', label: 'Project Group' },
      { value: 'committee', label: 'Committee' },
      { value: 'onboarding_cohort', label: 'Onboarding Cohort' },
      { value: 'social_club', label: 'Social Club' },
    ],
  },
  education: {
    label: 'School or education',
    orgNoun: 'School',
    ministryNoun: 'Department',
    ministryNounPlural: 'Departments',
    groupNoun: 'Class',
    groupNounPlural: 'Classes',
    leaderNoun: 'Instructor',
    leaderNounPlural: 'Instructors',
    memberNoun: 'Student',
    memberNounPlural: 'Students',
    eventNoun: 'Session',
    eventNounPlural: 'Sessions',
    tagline: 'Automate the logistics. Remember the context. Support every student.',
    groupTypes: [
      { value: 'class', label: 'Class' },
      { value: 'study_group', label: 'Study Group' },
      { value: 'club', label: 'Club' },
      { value: 'team', label: 'Team' },
      { value: 'tutoring_group', label: 'Tutoring Group' },
    ],
  },
  community: {
    label: 'Community or club',
    orgNoun: 'Community',
    ministryNoun: 'Division',
    ministryNounPlural: 'Divisions',
    groupNoun: 'Group',
    groupNounPlural: 'Groups',
    leaderNoun: 'Organizer',
    leaderNounPlural: 'Organizers',
    memberNoun: 'Member',
    memberNounPlural: 'Members',
    eventNoun: 'Event',
    eventNounPlural: 'Events',
    tagline: 'Automate the logistics. Remember the context. Strengthen the community.',
    groupTypes: [
      { value: 'club', label: 'Club' },
      { value: 'league_team', label: 'League Team' },
      { value: 'interest_group', label: 'Interest Group' },
      { value: 'volunteer_team', label: 'Volunteer Team' },
      { value: 'support_group', label: 'Support Group' },
    ],
  },
}

export function getTerminology(vertical: string | null | undefined): Terminology {
  return TERMINOLOGY[(vertical as Vertical) || 'church'] ?? TERMINOLOGY.church
}

export const VERTICAL_ORDER: Vertical[] = ['church', 'business', 'nonprofit', 'education', 'community']
