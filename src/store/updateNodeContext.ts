import { createContext, useContext } from 'react'

export const UpdateNodeContext = createContext<
  (nodeId: string, data: Record<string, unknown>) => void
>(() => {})

export function useUpdateNode() {
  return useContext(UpdateNodeContext)
}
