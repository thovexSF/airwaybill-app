import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN as string
const POSTHOG_HOST = (import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string) || 'https://us.i.posthog.com'

let initialized = false

export function initAnalytics() {
  if (initialized || !POSTHOG_KEY) return
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    session_recording: { recordCrossOriginIframes: false },
  })
  initialized = true
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
