import React, { createContext, useContext } from 'react'

/**
 * Marks an editor as running in the signed-out demo.
 *
 * Editors are reused verbatim between the real app and the demo; this context
 * is what tells their chrome to drop the account controls and Save, and to
 * send the download button to signup instead of generating a file. Using a
 * context rather than a prop keeps the individual editor pages untouched.
 */
const DemoModeContext = createContext(false)

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  return <DemoModeContext.Provider value={true}>{children}</DemoModeContext.Provider>
}

export function useDemoMode(): boolean {
  return useContext(DemoModeContext)
}
