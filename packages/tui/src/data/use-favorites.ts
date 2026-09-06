import { useCallback, useEffect } from "react"
import { useDispatch, useStore } from "../store/context.js"
import { useDb } from "../db/context.js"

/**
 * Hydrates the favorites list from the local DB on mount and exposes a
 * `toggleFavorite` callback that updates both DB and store state.
 */
export function useFavorites() {
  const dispatch = useDispatch()
  const state = useStore()
  const { favorites } = useDb()

  useEffect(() => {
    dispatch({ type: "SET_FAVORITES", favorites: favorites.list() })
  }, [])

  const toggleFavorite = useCallback(
    (name: string): boolean => {
      const next = favorites.toggle(name)
      dispatch({ type: "SET_FAVORITES", favorites: favorites.list() })
      return next
    },
    [favorites, dispatch],
  )

  return {
    favorites: state.favorites,
    toggleFavorite,
  }
}
