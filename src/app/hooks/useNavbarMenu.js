import { useState, useEffect, useCallback, useRef } from 'react';
import { categoriesService, subcategoriesService } from '../../services/categories.service.js';

/**
 * Fetches navbar categories for the header. Subcategories are loaded by category
 * via getSubcategoriesByCategoryId when user expands a category in the hamburger modal.
 * Returns { categories, subcategoriesByCategoryId, loadSubcategoriesForCategory, loading, subcategoriesLoading, error }.
 */
export function useNavbarMenu() {
  const [categories, setCategories] = useState([]);
  const [subcategoriesByCategoryId, setSubcategoriesByCategoryId] = useState({});
  const [loading, setLoading] = useState(true);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState({});
  const [error, setError] = useState(null);
  const requestedCategoryIds = useRef(new Set());

  /** Fetch subcategories by category id (used when user clicks a category in hamburger modal). */
  const loadSubcategoriesForCategory = useCallback(async (categoryId) => {
    const id = categoryId?.toString?.() ?? categoryId;
    if (!id) return;
    if (requestedCategoryIds.current.has(id)) return;
    requestedCategoryIds.current.add(id);
    setSubcategoriesLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await subcategoriesService.getNavbarByCategoryId(id);
      const list = res?.data?.data?.subcategories ?? res?.data?.subcategories ?? [];
      const subs = Array.isArray(list) ? list : [];
      setSubcategoriesByCategoryId((prev) => ({ ...prev, [id]: subs }));
    } catch {
      setSubcategoriesByCategoryId((prev) => ({ ...prev, [id]: [] }));
    } finally {
      setSubcategoriesLoading((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await categoriesService.getNavbar();
        const data = res?.data?.data ?? res?.data;
        const list = data?.categories ?? [];
        const categoryList = Array.isArray(list) ? list : [];
        if (!cancelled) setCategories(categoryList);
      } catch (err) {
        if (!cancelled) setError(err?.message ?? 'Failed to load menu');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return {
    categories: categories,
    subcategoriesByCategoryId,
    loadSubcategoriesForCategory,
    loading,
    subcategoriesLoading,
    error,
  };
}
