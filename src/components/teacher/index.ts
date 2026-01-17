/**
 * Teacher Dashboard Components
 * 
 * These components implement the UI Design Standards (Requirements 12.1-12.4):
 * - 12.1: Dense but clean layout with muted colors and no decorative animations
 * - 12.2: Clearly indicate enabled vs disabled states with visual distinction
 * - 12.3: Hide or disable non-permitted actions instead of showing errors after click
 * - 12.4: Display clear, specific error messages with next steps
 */

// Error and message components
export {
  ErrorMessagePanel,
  InlineError,
  SuccessMessage,
  WarningMessage,
  InfoMessage,
} from './error-message-panel'

// Status badges
export {
  StatusBadge,
  AttendanceStatusBadge,
  MarksStatusBadge,
  AssignmentStatusBadge,
} from './status-badge'

// Action buttons
export {
  ActionButton,
  IconActionButton,
  ButtonGroup,
} from './action-button'

// Existing components
export { AssignmentForm } from './assignment-form'
export { AssignmentDetail } from './assignment-detail'
