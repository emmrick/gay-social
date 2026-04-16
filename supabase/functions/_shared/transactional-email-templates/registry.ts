/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as verificationReminder } from './verification-reminder.tsx'
import { template as verificationRejected } from './verification-rejected.tsx'
import { template as verificationConfirmed } from './verification-confirmed.tsx'
import { template as welcomeEmail } from './welcome.tsx'
import { template as customMessage } from './custom-message.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'verification-reminder': verificationReminder,
  'verification-rejected': verificationRejected,
  'verification-confirmed': verificationConfirmed,
  'welcome': welcomeEmail,
  'custom-message': customMessage,
}
