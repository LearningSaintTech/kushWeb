import { createContext, useContext } from 'react'

export const CommunityFeedUiContext = createContext(null)

export function useCommunityFeedUi() {
  return useContext(CommunityFeedUiContext) || {}
}
