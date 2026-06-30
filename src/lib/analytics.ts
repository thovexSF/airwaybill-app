import posthog from 'posthog-js'

const POSTHOG_KEY = (
  import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN ||
  import.meta.env.VITE_POSTHOG_KEY
) as string | undefined
const POSTHOG_HOST = (
  import.meta.env.VITE_PUBLIC_POSTHOG_HOST ||
  import.meta.env.VITE_POSTHOG_HOST ||
  'https://us.i.posthog.com'
) as string

let initialized = false

export const posthogClient = posthog

export function initAnalytics() {
  if (initialized) return posthogClient

  if (!POSTHOG_KEY) {
    if (import.meta.env.DEV) {
      console.warn('PostHog disabled: missing VITE_PUBLIC_POSTHOG_PROJECT_TOKEN')
    }
    return posthogClient
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: '2026-01-30',
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    session_recording: { recordCrossOriginIframes: false },
  })
  initialized = true
  return posthogClient
}

export function identify(userId: string, properties?: Record<string, any>) {
  if (!initialized) return
  posthog.identify(userId, properties)
}

export function track(event: string, properties?: Record<string, any>) {
  if (!initialized) return
  posthog.capture(event, properties)
}

export function resetAnalytics() {
  if (!initialized) return
  posthog.reset()
}
